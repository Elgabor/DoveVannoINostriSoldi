import {
  discoverLatestStatePaymentDataset,
  getStatePaymentDatasetForPeriod,
  getStatePaymentDatasetTotal,
  type BdapDataset,
} from "@/lib/bdap-payments";

const MONTH_NAMES = [
  "GENNAIO",
  "FEBBRAIO",
  "MARZO",
  "APRILE",
  "MAGGIO",
  "GIUGNO",
  "LUGLIO",
  "AGOSTO",
  "SETTEMBRE",
  "OTTOBRE",
  "NOVEMBRE",
  "DICEMBRE",
] as const;

export type StateSpendingHistoryPoint = {
  year: number;
  month: number;
  monthName: string;
  label: string;
  cumulativePaid: number;
  monthlyPaid: number;
  source: {
    productCode: string;
    packageId: string;
    csvUrl: string;
    metadataModified: string | null;
  };
};

export type StateSpendingHistory = {
  year: number;
  latestMonth: number;
  latestMonthName: string;
  points: StateSpendingHistoryPoint[];
  observedAt: string;
  methodology: {
    cumulative: true;
    monthlyDerivation: "difference-between-consecutive-cumulative-snapshots";
    officialSemanticsUrl: string;
  };
};

async function requireMissionDataset(year: number, month: number): Promise<BdapDataset> {
  const dataset = await getStatePaymentDatasetForPeriod("mission", year, month);
  if (!dataset) {
    throw new Error(
      `Dataset Missione ${year}/${String(month).padStart(2, "0")} non trovato`,
    );
  }
  return dataset;
}

export async function getStateSpendingHistory(): Promise<StateSpendingHistory> {
  const latest = await discoverLatestStatePaymentDataset("mission");
  const year = latest.referenceYear;
  const latestMonth = latest.referenceMonth;

  const datasets = await Promise.all(
    Array.from({ length: latestMonth }, (_, index) => {
      const month = index + 1;
      return month === latestMonth ? Promise.resolve(latest) : requireMissionDataset(year, month);
    }),
  );

  const cumulativeTotals = await Promise.all(
    datasets.map((dataset) => getStatePaymentDatasetTotal(dataset)),
  );

  const points = datasets.map((dataset, index): StateSpendingHistoryPoint => {
    const cumulativePaid = cumulativeTotals[index] ?? 0;
    const previous = index === 0 ? 0 : cumulativeTotals[index - 1] ?? 0;
    const monthName =
      MONTH_NAMES[dataset.referenceMonth - 1] ?? `MESE ${dataset.referenceMonth}`;

    return {
      year,
      month: dataset.referenceMonth,
      monthName,
      label: monthName.slice(0, 3),
      cumulativePaid,
      monthlyPaid: cumulativePaid - previous,
      source: {
        productCode: dataset.productCode,
        packageId: dataset.packageId,
        csvUrl: dataset.csvUrl,
        metadataModified: dataset.metadataModified,
      },
    };
  });

  return {
    year,
    latestMonth,
    latestMonthName: MONTH_NAMES[latestMonth - 1] ?? `MESE ${latestMonth}`,
    points,
    observedAt: new Date().toISOString(),
    methodology: {
      cumulative: true,
      monthlyDerivation: "difference-between-consecutive-cumulative-snapshots",
      officialSemanticsUrl: "https://openbdap.rgs.mef.gov.it/it/News/Index/638",
    },
  };
}
