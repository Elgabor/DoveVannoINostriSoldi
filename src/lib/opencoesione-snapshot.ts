import rawSnapshot from "@/data/generated/opencoesione-overview.json";
import {
  assertOpenCoesioneSnapshot,
  paymentCostRatio,
  type OpenCoesioneSnapshot,
} from "@/lib/data/opencoesione-contract";

/**
 * The scheduled ETL validates this file before committing it. Re-validating at
 * module load protects local builds and makes schema drift fail closed.
 */
export const openCoesioneSnapshot: OpenCoesioneSnapshot =
  assertOpenCoesioneSnapshot(rawSnapshot);

export const openCoesionePaymentCostRatio = paymentCostRatio(openCoesioneSnapshot);
