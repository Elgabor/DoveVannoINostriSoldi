import type { OpenCivitasMunicipality } from "@/lib/data/opencivitas-contract";

/**
 * Cross-entity spending-outlier screening for Comuni.
 *
 * We start from the official OpenCivitas comparison — spesa storica meno
 * fabbisogno standard per abitante, a figure the source already normalizes
 * for population size, territorial characteristics and services offered —
 * and flag Comuni whose per-capita difference sits far outside the range of
 * *other Comuni in the same Regione*, using the Tukey IQR fence.
 *
 * This finds Comuni that stand out even after the official model's own
 * normalization, without inventing a second model. It is screening, not a
 * verdict: see METHODOLOGY_WARNING.
 */

export const METHODOLOGY_WARNING =
  "Un Comune fuori dall'intervallo dei Comuni della stessa Regione non ha automaticamente sprechi o meriti: " +
  "può dipendere da servizi aggiuntivi, costi locali, eventi eccezionali (per esempio ricostruzioni) o dati " +
  "segnalati dalla fonte come da verificare. Il metodo segnala dove guardare, non chi ha ragione.";

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
  medianPerCapitaCents: number;
  iqrPerCapitaCents: number;
  above: number;
  below: number;
};

export type SpendingOutlierSummary = {
  method: "tukey-iqr";
  fenceMultiplier: number;
  evaluatedMunicipalities: number;
  excludedForDataQuality: number;
  outliers: SpendingOutlier[];
  byRegion: RegionOutlierBreakdown[];
  methodologyWarning: string;
};

const DEFAULT_FENCE_MULTIPLIER = 1.5;

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
 * Comuni the source itself flags with sourceWarnings are excluded from the
 * statistics (their figures are not yet reliable enough to anchor a fence),
 * but the exclusion is counted so nothing silently disappears.
 */
export function computeSpendingOutliers(
  municipalities: readonly OpenCivitasMunicipality[],
  fenceMultiplier: number = DEFAULT_FENCE_MULTIPLIER,
): SpendingOutlierSummary {
  if (!Number.isFinite(fenceMultiplier) || fenceMultiplier <= 0) {
    throw new Error("fenceMultiplier deve essere un numero positivo");
  }

  const byRegion = new Map<string, OpenCivitasMunicipality[]>();
  let excludedForDataQuality = 0;

  for (const municipality of municipalities) {
    if (municipality.sourceWarnings.length > 0) {
      excludedForDataQuality += 1;
      continue;
    }
    const existing = byRegion.get(municipality.region);
    if (existing) existing.push(municipality);
    else byRegion.set(municipality.region, [municipality]);
  }

  const byRegionBreakdown: RegionOutlierBreakdown[] = [];
  const outliers: SpendingOutlier[] = [];

  for (const region of [...byRegion.keys()].sort((left, right) => left.localeCompare(right, "it-IT"))) {
    const regionMunicipalities = byRegion.get(region)!;
    // Fewer than 4 Comuni cannot support a stable quartile estimate.
    if (regionMunicipalities.length < 4) {
      byRegionBreakdown.push({
        region,
        evaluated: regionMunicipalities.length,
        excludedForDataQuality: 0,
        medianPerCapitaCents: 0,
        iqrPerCapitaCents: 0,
        above: 0,
        below: 0,
      });
      continue;
    }
    const { breakdown, outliers: regionOutliers } = summarizeRegion(
      region,
      regionMunicipalities,
      0,
      fenceMultiplier,
    );
    byRegionBreakdown.push(breakdown);
    outliers.push(...regionOutliers);
  }

  outliers.sort((left, right) => right.excessMultiple - left.excessMultiple);

  return {
    method: "tukey-iqr",
    fenceMultiplier,
    evaluatedMunicipalities: municipalities.length - excludedForDataQuality,
    excludedForDataQuality,
    outliers,
    byRegion: byRegionBreakdown,
    methodologyWarning: METHODOLOGY_WARNING,
  };
}
