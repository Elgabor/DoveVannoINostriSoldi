import type { OpenCivitasMunicipality } from "@/lib/data/opencivitas-contract";

/**
 * Cross-entity spending-outlier screening for Comuni.
 *
 * We start from the official OpenCivitas difference between historical and
 * standard spending per inhabitant. We then flag Comuni whose difference sits
 * far outside the range of other Comuni in the same Regione, using a Tukey IQR
 * fence. Service levels remain a separate source dimension and do not enter
 * this screening metric.
 *
 * This finds Comuni that stand out in a peer distribution without treating
 * the difference as a normalized performance score. It is screening, not a
 * verdict: see METHODOLOGY_WARNING.
 */

export const METHODOLOGY_WARNING =
  "Un Comune fuori dall'intervallo dei Comuni della stessa Regione non ha automaticamente sprechi o meriti: " +
  "può dipendere da servizi aggiuntivi, costi locali, eventi eccezionali (per esempio ricostruzioni) o dati " +
  "segnalati dalla fonte come da verificare. Lo screening non misura quantità o qualità dei servizi: " +
  "segnala dove guardare, non chi ha ragione.";

export type OutlierDirection = "sopra" | "sotto";

export type SpendingOutlier = {
  istatCode: string;
  name: string;
  province: string;
  region: string;
  differencePerCapitaCents: number;
  direction: OutlierDirection;
  /** How many interquartile ranges beyond the region's fence this Comune sits. */
  excessMultiple: number;
};

export type RegionOutlierBreakdown = {
  region: string;
  evaluated: number;
  excludedForDataQuality: number;
  medianPerCapitaCents: number | null;
  iqrPerCapitaCents: number | null;
  above: number;
  below: number;
};

export type SpendingOutlierSummary = {
  metricVersion: 1;
  measure: "historical-minus-standard-spending-per-capita-cents";
  method: "tukey-iqr";
  quantileConvention: "linear-interpolation-r7";
  fenceMultiplier: number;
  minimumRegionSize: 4;
  evaluatedMunicipalities: number;
  excludedForDataQuality: number;
  outliers: SpendingOutlier[];
  byRegion: RegionOutlierBreakdown[];
  methodologyWarning: string;
};

const DEFAULT_FENCE_MULTIPLIER = 1.5;
const MINIMUM_REGION_SIZE = 4;

const WARNINGS_UNRELATED_TO_SPENDING_DIFFERENCE = new Set([
  "DIFF_OUT_PERC_TOT",
  "POSIZIONE_SPESA_PERC_TOT",
  "POSIZIONE_OUTPUT_PERC_TOT",
  "DESCR_NON_VALUTABILE_SPESA_TOT",
  "DESCR_NON_VALUTABILE_OUT_TOT",
]);

function warningAffectsSpendingDifference(warning: string): boolean {
  const field = warning.split(":", 1)[0]?.trim();
  return !field || !WARNINGS_UNRELATED_TO_SPENDING_DIFFERENCE.has(field);
}

/**
 * Linear-interpolation quantile (the same convention as Excel's
 * PERCENTILE.INC / numpy's default), over an already-sorted array.
 */
function quantile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 1) return sortedValues[0];
  const position = p * (sortedValues.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function summarizeRegion(
  region: string,
  municipalities: OpenCivitasMunicipality[],
  excludedForDataQuality: number,
  fenceMultiplier: number,
): { breakdown: RegionOutlierBreakdown; outliers: SpendingOutlier[] } {
  const sorted = [...municipalities].sort(
    (left, right) => left.differencePerCapitaCents - right.differencePerCapitaCents,
  );
  const values = sorted.map((item) => item.differencePerCapitaCents);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const median = quantile(values, 0.5);
  const lowerFence = q1 - fenceMultiplier * iqr;
  const upperFence = q3 + fenceMultiplier * iqr;

  const outliers: SpendingOutlier[] = [];
  let above = 0;
  let below = 0;

  for (const municipality of sorted) {
    const value = municipality.differencePerCapitaCents;
    if (iqr <= 0 || (value >= lowerFence && value <= upperFence)) continue;

    const direction: OutlierDirection = value > upperFence ? "sopra" : "sotto";
    const fenceDistance = direction === "sopra" ? value - upperFence : lowerFence - value;
    if (direction === "sopra") above += 1;
    else below += 1;

    outliers.push({
      istatCode: municipality.istatCode,
      name: municipality.name,
      province: municipality.province,
      region: municipality.region,
      differencePerCapitaCents: value,
      direction,
      excessMultiple: iqr > 0 ? fenceDistance / iqr : 0,
    });
  }

  return {
    breakdown: {
      region,
      evaluated: municipalities.length,
      excludedForDataQuality,
      medianPerCapitaCents: median,
      iqrPerCapitaCents: iqr,
      above,
      below,
    },
    outliers,
  };
}

/**
 * Computes per-Regione spending outliers among Comuni covered by OpenCivitas.
 * Only warnings affecting the four monetary inputs exclude a Comune. Warnings
 * about service indicators do not invalidate the spending difference used by
 * this metric. Unknown warning fields fail closed. Every exclusion is counted
 * nationally and in its Regione.
 */
export function computeSpendingOutliers(
  municipalities: readonly OpenCivitasMunicipality[],
  fenceMultiplier: number = DEFAULT_FENCE_MULTIPLIER,
): SpendingOutlierSummary {
  if (!Number.isFinite(fenceMultiplier) || fenceMultiplier <= 0) {
    throw new Error("fenceMultiplier deve essere un numero positivo");
  }

  const byRegion = new Map<
    string,
    { municipalities: OpenCivitasMunicipality[]; excludedForDataQuality: number }
  >();

  for (const municipality of municipalities) {
    const bucket = byRegion.get(municipality.region) ?? {
      municipalities: [],
      excludedForDataQuality: 0,
    };
    byRegion.set(municipality.region, bucket);

    if (municipality.sourceWarnings.some(warningAffectsSpendingDifference)) {
      bucket.excludedForDataQuality += 1;
      continue;
    }
    bucket.municipalities.push(municipality);
  }

  const byRegionBreakdown: RegionOutlierBreakdown[] = [];
  const outliers: SpendingOutlier[] = [];

  for (const region of [...byRegion.keys()].sort((left, right) => left.localeCompare(right, "it-IT"))) {
    const bucket = byRegion.get(region)!;
    const regionMunicipalities = bucket.municipalities;
    // Fewer than 4 Comuni cannot support a stable quartile estimate.
    if (regionMunicipalities.length < MINIMUM_REGION_SIZE) {
      byRegionBreakdown.push({
        region,
        evaluated: regionMunicipalities.length,
        excludedForDataQuality: bucket.excludedForDataQuality,
        medianPerCapitaCents: null,
        iqrPerCapitaCents: null,
        above: 0,
        below: 0,
      });
      continue;
    }
    const { breakdown, outliers: regionOutliers } = summarizeRegion(
      region,
      regionMunicipalities,
      bucket.excludedForDataQuality,
      fenceMultiplier,
    );
    byRegionBreakdown.push(breakdown);
    outliers.push(...regionOutliers);
  }

  outliers.sort((left, right) => right.excessMultiple - left.excessMultiple);
  const excludedForDataQuality = byRegionBreakdown.reduce(
    (total, region) => total + region.excludedForDataQuality,
    0,
  );
  const evaluatedMunicipalities = byRegionBreakdown.reduce(
    (total, region) => total + region.evaluated,
    0,
  );

  return {
    metricVersion: 1,
    measure: "historical-minus-standard-spending-per-capita-cents",
    method: "tukey-iqr",
    quantileConvention: "linear-interpolation-r7",
    fenceMultiplier,
    minimumRegionSize: MINIMUM_REGION_SIZE,
    evaluatedMunicipalities,
    excludedForDataQuality,
    outliers,
    byRegion: byRegionBreakdown,
    methodologyWarning: METHODOLOGY_WARNING,
  };
}
