export type InpsSourceDocument = {
  id: string;
  title: string;
  owner: string;
  url: string;
  documentDate: string;
  dateNote: string;
  locator: string;
  observedAt: string;
  sha256: string;
  rightsNote: string;
};

export type InpsCivilInvaliditySnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  scope: "civil-invalidity-benefits";
  spending: {
    unit: "euro-cents";
    measure: string;
    series: Array<{ year: number; amountCents: number }>;
    latestChangeCents: number;
    latestChangePercent: number;
    sourceId: string;
  };
  managementDetail2024: {
    unit: "million-euros-rounded";
    scope: string;
    civilInvalidityPensions: number;
    attendanceAllowances: number;
    sourceId: string;
    warning: string;
  };
  benefitsStock: {
    asOf: string;
    totalBenefits: number;
    attendanceAllowances: number;
    civilInvalidityPensions: number;
    sourceId: string;
  };
  regionalNewPensions: {
    measure: string;
    unit: "benefits";
    years: number[];
    provisionalYears: number[];
    excludedRegions: string[];
    regions: Array<{ region: string; values: number[] }>;
    nationalTotals: number[];
    sourceId: string;
    warning: string;
  };
  territorialAvailability: {
    publicStructuredLevel: "region";
    province: string;
    municipality: string;
    individuals: string;
  };
  methodology: {
    definitions: string;
    comparability: string;
    interpretation: string;
    perCapita: string;
  };
  sources: InpsSourceDocument[];
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Snapshot INPS non valido: ${message}`);
}

export function validateInpsCivilInvaliditySnapshot(
  snapshot: InpsCivilInvaliditySnapshot,
): InpsCivilInvaliditySnapshot {
  invariant(snapshot.schemaVersion === 1, "schemaVersion non supportata");
  invariant(snapshot.scope === "civil-invalidity-benefits", "perimetro inatteso");
  invariant(snapshot.spending.series.length >= 2, "serie di spesa insufficiente");
  invariant(snapshot.sources.length >= 3, "provenienza incompleta");

  const spendingYears = snapshot.spending.series.map((point) => point.year);
  invariant(new Set(spendingYears).size === spendingYears.length, "anni di spesa duplicati");
  invariant(
    snapshot.spending.series.every(
      (point, index) =>
        Number.isSafeInteger(point.amountCents) &&
        point.amountCents >= 0 &&
        (index === 0 || point.year > snapshot.spending.series[index - 1].year),
    ),
    "serie di spesa non valida o non ordinata",
  );

  const sourceIds = new Set(snapshot.sources.map((source) => source.id));
  invariant(sourceIds.size === snapshot.sources.length, "identificativi fonte duplicati");
  for (const source of snapshot.sources) {
    invariant(/^https:\/\/www\.inps\.it\//.test(source.url), `URL non ufficiale: ${source.url}`);
    invariant(/^[a-f0-9]{64}$/.test(source.sha256), `hash non valido: ${source.id}`);
    invariant(
      !Number.isNaN(Date.parse(source.documentDate)),
      `data documento non valida: ${source.id}`,
    );
    invariant(
      !Number.isNaN(Date.parse(source.observedAt)),
      `data osservazione non valida: ${source.id}`,
    );
    invariant(source.locator.trim().length > 0, `riferimento pagina mancante: ${source.id}`);
  }

  const years = snapshot.regionalNewPensions.years;
  invariant(new Set(years).size === years.length, "anni regionali duplicati");
  invariant(
    years.every((year, index) => index === 0 || year > years[index - 1]),
    "anni regionali non ordinati",
  );
  invariant(
    years.length === snapshot.regionalNewPensions.nationalTotals.length,
    "totali nazionali non allineati agli anni",
  );
  for (const region of snapshot.regionalNewPensions.regions) {
    invariant(
      region.values.length === years.length,
      `serie regionale incompleta: ${region.region}`,
    );
    invariant(
      region.values.every((value) => Number.isInteger(value) && value >= 0),
      `valore regionale non valido: ${region.region}`,
    );
  }
  const regionNames = snapshot.regionalNewPensions.regions.map((region) => region.region);
  invariant(new Set(regionNames).size === regionNames.length, "regioni duplicate");
  invariant(
    regionNames.every(
      (region, index) =>
        index === 0 || regionNames[index - 1].localeCompare(region, "it-IT") <= 0,
    ),
    "regioni non ordinate alfabeticamente",
  );
  years.forEach((year, index) => {
    const regionalTotal = snapshot.regionalNewPensions.regions.reduce(
      (sum, region) => sum + region.values[index],
      0,
    );
    invariant(
      regionalTotal === snapshot.regionalNewPensions.nationalTotals[index],
      `totale ${year} non riconciliato`,
    );
  });

  invariant(
    snapshot.benefitsStock.attendanceAllowances +
      snapshot.benefitsStock.civilInvalidityPensions ===
      snapshot.benefitsStock.totalBenefits,
    "stock prestazioni non riconciliato",
  );
  invariant(
    snapshot.spending.latestChangeCents ===
      snapshot.spending.series.at(-1)!.amountCents -
        snapshot.spending.series.at(-2)!.amountCents,
    "variazione di spesa non riconciliata",
  );
  const previousSpending = snapshot.spending.series.at(-2)!.amountCents;
  const computedChangePercent =
    previousSpending === 0
      ? 0
      : (snapshot.spending.latestChangeCents / previousSpending) * 100;
  invariant(
    Math.abs(computedChangePercent - snapshot.spending.latestChangePercent) < 0.05,
    "percentuale di variazione non riconciliata",
  );
  for (const sourceId of [
    snapshot.spending.sourceId,
    snapshot.managementDetail2024.sourceId,
    snapshot.benefitsStock.sourceId,
    snapshot.regionalNewPensions.sourceId,
  ]) {
    invariant(sourceIds.has(sourceId), `fonte mancante: ${sourceId}`);
  }

  return snapshot;
}
