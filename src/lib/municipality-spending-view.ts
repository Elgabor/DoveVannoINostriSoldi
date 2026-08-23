const FRIENDLY_LABELS: Readonly<Record<string, string>> = {
  "0": "Pagamenti da classificare",
  "1": "Spese correnti",
  "2": "Investimenti e opere",
  "3": "Attività finanziarie",
  "4": "Rimborso di prestiti",
  "5": "Anticipazioni di tesoreria",
  "7": "Partite di giro e conto terzi",
};

export type MunicipalitySpendingRow = Readonly<{
  key: string;
  label: string;
  amountCents: number;
}>;

export function buildMunicipalitySpendingRows(
  titles: readonly Readonly<{ code: string; label: string; amountCents: number }>[],
  totalCents: number | null,
): readonly MunicipalitySpendingRow[] {
  if (totalCents === null) return [];
  const main = [...titles]
    .filter((title) => title.amountCents > 0)
    .sort((left, right) => right.amountCents - left.amountCents)
    .slice(0, 4)
    .map((title) => ({
      key: title.code,
      label: FRIENDLY_LABELS[title.code] ?? title.label,
      amountCents: title.amountCents,
    }));
  const mainCents = main.reduce((sum, row) => sum + row.amountCents, 0);
  if (mainCents > totalCents) throw new Error("Categorie principali oltre il totale comunale");
  const otherCents = totalCents - mainCents;
  return otherCents > 0
    ? [...main, { key: "other", label: "Altre categorie", amountCents: otherCents }]
    : main;
}
