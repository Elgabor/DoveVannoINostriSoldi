import { computeSpendingOutliers } from "@/lib/anomaly-indicators";
import type { OpenCivitasMunicipality } from "@/lib/data/opencivitas-contract";
import { openCivitasSnapshot } from "@/lib/opencivitas-snapshot";

const municipalitiesByRegion = new Map<string, OpenCivitasMunicipality[]>(
  openCivitasSnapshot.coverage.regionNames.map((region) => [region, []]),
);
for (const municipality of openCivitasSnapshot.municipalities) {
  municipalitiesByRegion.get(municipality.region)!.push(municipality);
}

export const openCivitasSpendingOutliers = computeSpendingOutliers(
  openCivitasSnapshot.municipalities,
);

const spendingOutliersByRegion = new Map(
  [...municipalitiesByRegion].map(([region, municipalities]) => [
    region,
    computeSpendingOutliers(municipalities),
  ]),
);

export function getOpenCivitasSpendingOutliers(region: string | null) {
  return region === null
    ? openCivitasSpendingOutliers
    : spendingOutliersByRegion.get(region) ?? null;
}
