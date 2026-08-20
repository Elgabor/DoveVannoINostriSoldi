import snapshot from "@/data/generated/siope-municipal.json";

export type SiopeMunicipalMonthlyPoint = {
  month: number;
  label: string;
  flow: number;
  cumulative: number;
};

export type SiopeRegionPoint = {
  region: string;
  value: number;
  population: number | null;
  perCapita: number | null;
  municipalities: number;
};

export type SiopeSpendingTitle = {
  code: string;
  label: string;
  value: number;
};

export type SiopeMunicipalityPoint = {
  name: string;
  region: string;
  codiceFiscale: string;
  population: number | null;
  value: number;
  perCapita: number | null;
};

export type SiopeMunicipalSnapshot = {
  schemaVersion: number;
  generatedAt: string;
  scope: "municipalities";
  year: number;
  latestMonth: number;
  latestMonthLabel: string;
  totalPaid: number;
  populationCovered: number;
  nationalPerCapita: number | null;
  coverage: {
    activeSiopeMunicipalities: number;
    matchedToIpaRegion: number;
    withMovements: number;
    unmatchedToIpaRegion: number;
    movementRows: number;
    includedMovementRows: number;
    malformedRows: number;
  };
  monthly: SiopeMunicipalMonthlyPoint[];
  regions: SiopeRegionPoint[];
  titles: SiopeSpendingTitle[];
  topMunicipalities: SiopeMunicipalityPoint[];
  source: {
    siopeOwner: string;
    siopeMovementsUrl: string;
    siopeRegistryUrl: string;
    ipaUrl: string;
    siopeMovementsLastModified: string | null;
    siopeRegistryLastModified: string | null;
    ipaLastModified: string | null;
    observedAt: string;
  };
  methodology: {
    measure: string;
    periodicity: string;
    territorialJoin: string;
    warning: string;
  };
};

/**
 * The generated file is validated by the SIOPE ETL workflow before it can be
 * committed. Keeping it as a versioned build input makes web requests cheap,
 * deterministic and independent from a 50+ MB upstream download.
 */
export const siopeMunicipalSnapshot = snapshot as SiopeMunicipalSnapshot;

export function regionsByPerCapita(
  data: SiopeMunicipalSnapshot = siopeMunicipalSnapshot,
): SiopeRegionPoint[] {
  return [...data.regions]
    .filter((region) => region.perCapita !== null)
    .sort((left, right) => (right.perCapita ?? 0) - (left.perCapita ?? 0));
}
