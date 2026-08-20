import rawSnapshot from "@/data/generated/inps-civil-invalidity.json";
import {
  validateInpsCivilInvaliditySnapshot,
  type InpsCivilInvaliditySnapshot,
} from "@/lib/data/inps-invalidity-contract";

export const inpsCivilInvaliditySnapshot = validateInpsCivilInvaliditySnapshot(
  rawSnapshot as InpsCivilInvaliditySnapshot,
);

export const availableInpsSpendingYears = inpsCivilInvaliditySnapshot.spending.series.map(
  (point) => point.year,
);

export const availableInpsRegionalYears = inpsCivilInvaliditySnapshot.regionalNewPensions.years;

function normalizedRegion(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("it-IT")
    .replace(/[‘’`´]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

export type InpsCivilInvalidityQuery = {
  year?: number;
  region?: string;
};

export function queryInpsCivilInvalidity(query: InpsCivilInvalidityQuery = {}) {
  const validYears = new Set([...availableInpsSpendingYears, ...availableInpsRegionalYears]);
  if (query.year !== undefined && !validYears.has(query.year)) {
    throw new Error(
      `Anno INPS non disponibile. Anni validi: ${[...validYears].sort().join(", ")}.`,
    );
  }

  const requestedRegion = query.region ? normalizedRegion(query.region) : null;
  if (
    requestedRegion &&
    query.year !== undefined &&
    !availableInpsRegionalYears.includes(query.year)
  ) {
    throw new Error(`Il dettaglio regionale INPS non è disponibile per il ${query.year}.`);
  }
  const excluded = inpsCivilInvaliditySnapshot.regionalNewPensions.excludedRegions.find(
    (region) => normalizedRegion(region) === requestedRegion,
  );
  if (excluded) {
    throw new Error(
      `${excluded} non è inclusa nella serie INPS perché le prestazioni sono erogate direttamente dalle autonomie territoriali.`,
    );
  }

  const regions = requestedRegion
    ? inpsCivilInvaliditySnapshot.regionalNewPensions.regions.filter(
        (region) => normalizedRegion(region.region) === requestedRegion,
      )
    : inpsCivilInvaliditySnapshot.regionalNewPensions.regions;
  if (requestedRegion && regions.length === 0) {
    throw new Error(`Regione INPS non disponibile: ${query.region?.trim()}.`);
  }

  const selectedYearIndexes = inpsCivilInvaliditySnapshot.regionalNewPensions.years
    .map((year, index) => ({ year, index }))
    .filter(({ year }) => query.year === undefined || year === query.year);

  return {
    scope: inpsCivilInvaliditySnapshot.scope,
    spending: {
      ...inpsCivilInvaliditySnapshot.spending,
      series: inpsCivilInvaliditySnapshot.spending.series.filter(
        (point) => query.year === undefined || point.year === query.year,
      ),
    },
    managementDetail2024:
      query.year === undefined || query.year === 2024
        ? inpsCivilInvaliditySnapshot.managementDetail2024
        : null,
    benefitsStock: inpsCivilInvaliditySnapshot.benefitsStock,
    regionalNewPensions: {
      ...inpsCivilInvaliditySnapshot.regionalNewPensions,
      years: selectedYearIndexes.map(({ year }) => year),
      nationalTotals: selectedYearIndexes.map(
        ({ index }) => inpsCivilInvaliditySnapshot.regionalNewPensions.nationalTotals[index],
      ),
      regions:
        selectedYearIndexes.length === 0
          ? []
          : regions.map((region) => ({
              region: region.region,
              values: selectedYearIndexes.map(({ index }) => region.values[index]),
            })),
    },
    territorialAvailability: inpsCivilInvaliditySnapshot.territorialAvailability,
    methodology: inpsCivilInvaliditySnapshot.methodology,
    provenance: inpsCivilInvaliditySnapshot.sources,
  };
}
