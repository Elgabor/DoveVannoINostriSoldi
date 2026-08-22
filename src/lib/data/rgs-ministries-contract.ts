export type RgsMinistry = {
  code: string;
  label: string;
  commitmentsCpCents: number;
  paymentsCompetenceCpCents: number;
  paymentsResidualRsCents: number;
  paymentsCashCsCents: number;
  remainingCpCents: number;
  remainingRsCents: number;
  residualsEndCents: number;
  missions: Array<{
    code: string;
    label: string;
    commitmentsCpCents: number;
    paymentsCompetenceCpCents: number;
    remainingCpCents: number;
  }>;
};

export type RgsMinistriesData = {
  schemaVersion: 1;
  referenceYear: 2025;
  period: { kind: "consuntivo"; year: 2025 };
  accountingFrame: "competenza";
  unit: "EUR";
  valueEncoding: "integer_cents";
  totals: Omit<RgsMinistry, "code" | "label" | "missions">;
  ministries: RgsMinistry[];
  coverage: { sourceRows: 5395; includedRows: 5395; headers: 41; ministries: 15; rowsReconciled: 5395 };
  definitions: Record<string, string>;
};

export type RgsMinistriesMetadata = {
  schemaVersion: 1;
  source: {
    owner: string;
    landingUrl: string;
    resourceUrl: string;
    sourceRecordId: "2025_RND_SPE_ELB_CAP_001";
    referencePeriod: "2025";
    createdAt: string;
    updatedAt: string;
    acquiredAt: string;
    format: "csv";
    licenseStatus: "declared";
    licenseName: "CC BY 3.0";
  };
  asset: { bytes: 4196648; sha256: string; encoding: "cp1252"; delimiter: ";" };
  transformation: { version: 1; description: string };
  dataArtifact: { path: string; bytes: number; sha256: string };
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Snapshot Ministeri non valido: ${message}`);
}

function money(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

const EXPECTED_MINISTRIES: ReadonlyMap<string, string> = new Map([
  ["02", "MINISTERO DELL'ECONOMIA E DELLE FINANZE"],
  ["03", "MINISTERO DELLE IMPRESE E DEL MADE IN ITALY"],
  ["04", "MINISTERO DEL LAVORO E DELLE POLITICHE SOCIALI"],
  ["05", "MINISTERO DELLA GIUSTIZIA"],
  ["06", "MINISTERO DEGLI AFFARI ESTERI E DELLA COOPERAZIONE INTERNAZIONALE"],
  ["07", "MINISTERO DELL'ISTRUZIONE E DEL MERITO"],
  ["08", "MINISTERO DELL'INTERNO"],
  ["09", "MINISTERO DELL'AMBIENTE E DELLA SICUREZZA ENERGETICA"],
  ["10", "MINISTERO DELLE INFRASTRUTTURE E DEI TRASPORTI"],
  ["11", "MINISTERO DELL'UNIVERSITA' E DELLA RICERCA"],
  ["12", "MINISTERO DELLA DIFESA"],
  ["13", "MINISTERO DELL'AGRICOLTURA, DELLA SOVRANITA' ALIMENTARE E DELLE FORESTE"],
  ["14", "MINISTERO DELLA CULTURA"],
  ["15", "MINISTERO DELLA SALUTE"],
  ["16", "MINISTERO DEL TURISMO"],
] as const);

export function validateRgsMinistriesSnapshot(data: RgsMinistriesData, metadata: RgsMinistriesMetadata) {
  invariant(data.schemaVersion === 1 && metadata.schemaVersion === 1, "versione inattesa");
  invariant(
    data.referenceYear === 2025 && data.period.kind === "consuntivo" && data.period.year === 2025 &&
      data.accountingFrame === "competenza" && data.unit === "EUR" && data.valueEncoding === "integer_cents",
    "periodo, frame o unità inattesi",
  );
  invariant(data.ministries.length === 15 && data.coverage.ministries === 15, "copertura amministrazioni inattesa");
  invariant(
    data.coverage.sourceRows === 5395 && data.coverage.includedRows === 5395 &&
      data.coverage.rowsReconciled === 5395 && data.coverage.headers === 41,
    "schema o righe inattesi",
  );
  invariant(
    data.ministries.every((item) => EXPECTED_MINISTRIES.get(item.code) === item.label),
    "identità amministrazioni inattese",
  );
  invariant(Object.values(data.totals).every(money), "totali monetari non validi");
  const moneyFields = [
    "commitmentsCpCents",
    "paymentsCompetenceCpCents",
    "paymentsResidualRsCents",
    "paymentsCashCsCents",
    "remainingCpCents",
    "remainingRsCents",
    "residualsEndCents",
  ] as const;
  invariant(
    data.ministries.every((ministry) =>
      ministry.label.trim() && moneyFields.every((field) => money(ministry[field]))),
    "riga Ministero incompleta",
  );
  invariant(
    moneyFields.every((field) =>
      data.ministries.reduce((sum, ministry) => sum + ministry[field], 0) === data.totals[field]),
    "totali Ministeri non riconciliati",
  );
  invariant(
    data.ministries.every((ministry) =>
      ministry.missions.length > 0 &&
      new Map(ministry.missions.map((mission) => [mission.code, mission.label])).size === ministry.missions.length &&
      ministry.missions.every((mission) =>
        mission.code && mission.label && money(mission.commitmentsCpCents) &&
        money(mission.paymentsCompetenceCpCents) && money(mission.remainingCpCents) &&
        mission.commitmentsCpCents === mission.paymentsCompetenceCpCents + mission.remainingCpCents) &&
      ministry.missions.reduce((sum, mission) => sum + mission.commitmentsCpCents, 0) === ministry.commitmentsCpCents &&
      ministry.missions.reduce((sum, mission) => sum + mission.paymentsCompetenceCpCents, 0) === ministry.paymentsCompetenceCpCents &&
      ministry.missions.reduce((sum, mission) => sum + mission.remainingCpCents, 0) === ministry.remainingCpCents),
    "missioni non riconciliate",
  );
  invariant(data.totals.paymentsCashCsCents === data.totals.paymentsCompetenceCpCents + data.totals.paymentsResidualRsCents, "pagamenti CS non riconciliati");
  invariant(data.totals.commitmentsCpCents === data.totals.paymentsCompetenceCpCents + data.totals.remainingCpCents, "impegni CP non riconciliati");
  invariant(data.totals.residualsEndCents === data.totals.remainingCpCents + data.totals.remainingRsCents, "residui finali non riconciliati");
  invariant(metadata.source.owner === "Ragioneria Generale dello Stato", "titolare inatteso");
  invariant(metadata.source.landingUrl.startsWith("https://bdap-opendata.rgs.mef.gov.it/"), "landing non ufficiale");
  invariant(metadata.source.resourceUrl.startsWith("https://bdap-opendata.rgs.mef.gov.it/"), "risorsa non ufficiale");
  invariant(metadata.source.licenseStatus === "declared" && metadata.source.licenseName === "CC BY 3.0", "licenza inattesa");
  invariant(metadata.asset.bytes === 4196648 && /^[a-f0-9]{64}$/.test(metadata.asset.sha256), "asset non valido");
  invariant(metadata.transformation.version === 1 && metadata.transformation.description.trim(), "trasformazione assente");
  return { data, metadata };
}
