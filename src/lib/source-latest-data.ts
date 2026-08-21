import { consulentiSnapshot } from "@/lib/consulenti-snapshot";
import { anacCigSnapshot } from "@/lib/anac-cig-snapshot";
import { cptRegionalFiscalSnapshot } from "@/lib/cpt-regional-fiscal-snapshot";
import { inpsCivilInvaliditySnapshot } from "@/lib/inps-invalidity-snapshot";
import { mefParticipationsSnapshot } from "@/lib/mef-participations-snapshot";
import { openCivitasSnapshot } from "@/lib/opencivitas-snapshot";
import { openCoesioneSnapshot } from "@/lib/opencoesione-snapshot";
import { parliamentSnapshot } from "@/lib/parliament-snapshot";
import { siopeMunicipalSnapshot } from "@/lib/siope-snapshot";

export type SourceLatestData =
  | { kind: "date"; value: string }
  | { kind: "period"; label: string }
  | null;

function dated(value: string | null): SourceLatestData {
  return value ? { kind: "date", value } : null;
}

/* A null value means that the adapter discovers the latest release at request
   time. Annual periods remain periods: they must not be converted into an
   invented day just to reuse date formatting. */
export const latestDataBySlug: Readonly<Record<string, SourceLatestData>> = {
  siope: dated(siopeMunicipalSnapshot.source.siopeMovementsLastModified),
  ipa: dated(siopeMunicipalSnapshot.source.ipaLastModified),
  opencoesione: { kind: "date", value: openCoesioneSnapshot.referenceDate },
  opencivitas: { kind: "date", value: openCivitasSnapshot.publishedAt },
  "partecipazioni-pubbliche": { kind: "date", value: mefParticipationsSnapshot.publishedAt },
  anac: { kind: "period", label: String(anacCigSnapshot.referenceYear) },
  consulenti: { kind: "period", label: `${consulentiSnapshot.latestYear} · parziale` },
  camera: {
    kind: "period",
    label: String(
      Math.max(...parliamentSnapshot.chambers.flatMap((chamber) => chamber.statements.map((item) => item.year))),
    ),
  },
  inps: {
    kind: "period",
    label: `spesa ${inpsCivilInvaliditySnapshot.spending.series.at(-1)!.year} · territori ${inpsCivilInvaliditySnapshot.regionalNewPensions.years.at(-1)}`,
  },
  cpt: { kind: "period", label: String(cptRegionalFiscalSnapshot.defaultYear) },
};
