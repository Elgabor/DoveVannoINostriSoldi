import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = resolve(ROOT, "src/data/generated/company-atlas-snapshot.json");

export const SOURCE_URLS = Object.freeze({
  activeStock: "https://opendata.marche.camcom.it/data/Stock-Imprese-Attive-Italia.json",
  workforce: "https://opendata.marche.camcom.it/data/2026-Q2-Addetti-Localizzazioni-Attive-Italia.csv",
  productionValue: "https://opendata.marche.camcom.it/data/Stock-Imprese-Attive-Italia-Valore-Produzione.json",
});

const REGION_CODES = Object.freeze({
  ITF1: "13",
  ITF5: "17",
  ITF6: "18",
  ITF3: "15",
  ITH5: "08",
  ITH4: "06",
  ITI4: "12",
  ITC3: "07",
  ITC4: "03",
  ITI3: "11",
  ITF2: "14",
  ITC1: "01",
  ITF4: "16",
  ITG2: "20",
  ITG1: "19",
  ITI1: "09",
  ITH1_H2: "04",
  ITI2: "10",
  ITC2: "02",
  ITH3: "05",
});

const REGION_NAMES = Object.freeze({
  "01": "Piemonte",
  "02": "Valle d'Aosta",
  "03": "Lombardia",
  "04": "Trentino-Alto Adige",
  "05": "Veneto",
  "06": "Friuli-Venezia Giulia",
  "07": "Liguria",
  "08": "Emilia-Romagna",
  "09": "Toscana",
  "10": "Umbria",
  "11": "Marche",
  "12": "Lazio",
  "13": "Abruzzo",
  "14": "Molise",
  "15": "Campania",
  "16": "Puglia",
  "17": "Basilicata",
  "18": "Calabria",
  "19": "Sicilia",
  "20": "Sardegna",
});

const REGION_SOURCE_NAMES = Object.freeze({
  ABRUZZO: "13",
  BASILICATA: "17",
  CALABRIA: "18",
  CAMPANIA: "15",
  "EMILIA-ROMAGNA": "08",
  "FRIULI-VENEZIA GIULIA": "06",
  LAZIO: "12",
  LIGURIA: "07",
  LOMBARDIA: "03",
  MARCHE: "11",
  MOLISE: "14",
  PIEMONTE: "01",
  PUGLIA: "16",
  SARDEGNA: "20",
  SICILIA: "19",
  TOSCANA: "09",
  "TRENTINO-ALTO ADIGE": "04",
  UMBRIA: "10",
  "VALLE D'AOSTA": "02",
  VENETO: "05",
});

const LICENSE = "CC BY 4.0";
const ATECO_VERSION = "ATECO 2025";
const OBSERVED_AT = process.argv.find((arg) => arg.startsWith("--observed-at="))?.split("=", 2)[1]
  ?? process.env.COMPANY_ATLAS_OBSERVED_AT
  ?? new Date().toISOString();

function categoryCodes(dataset, dimensionId) {
  const category = dataset.dimension[dimensionId].category;
  return Array.isArray(category.index) ? category.index : Object.keys(category.label);
}

function categoryLabel(dataset, dimensionId, code) {
  return dataset.dimension[dimensionId].category.label[code] ?? code;
}

function readJsonStatValue(dataset, selection) {
  const positions = dataset.id.map((dimensionId) => {
    const codes = categoryCodes(dataset, dimensionId);
    const position = codes.indexOf(String(selection[dimensionId]));
    if (position < 0) throw new Error(`Codice ${selection[dimensionId]} non trovato in ${dimensionId}`);
    return position;
  });

  let offset = 0;
  for (let index = 0; index < positions.length; index += 1) {
    let stride = 1;
    for (let next = index + 1; next < dataset.size.length; next += 1) stride *= dataset.size[next];
    offset += positions[index] * stride;
  }
  return dataset.value[offset] ?? null;
}

function displaySectorLabel(label, code) {
  return label.replace(new RegExp(`^${code}\\s*-\\s*`), "");
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addNullable(target, value) {
  if (value === null) return target;
  return (target ?? 0) + value;
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url} ha risposto HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url} ha risposto HTTP ${response.status}`);
  return response.text();
}

function sourceRecord({ id, label, url, updatedAt, cadence, coverage, caveat }) {
  return {
    id,
    label,
    url,
    publisher: "CCIAA Marche su dati InfoCamere",
    license: LICENSE,
    updatedAt,
    observedAt: OBSERVED_AT,
    cadence,
    coverage,
    caveat,
  };
}

function normalizeActiveStock(dataset) {
  const sourceRegions = dataset.dimension.geo.category.child.IT;
  const sectors = categoryCodes(dataset, "ateco2025").filter((code) => code !== "TOTAL");
  const periods = categoryCodes(dataset, "time").map((code) => ({
    id: categoryLabel(dataset, "time", code),
    label: categoryLabel(dataset, "time", code),
  }));
  const observations = [];

  for (const sourceRegionCode of sourceRegions) {
    const regionCode = REGION_CODES[sourceRegionCode];
    if (!regionCode) throw new Error(`Regione JSON-stat non mappata: ${sourceRegionCode}`);
    for (const sectorCode of sectors) {
      for (const period of periods) {
        observations.push({
          observationType: "aggregate",
          geographyLevel: "region",
          geographyCode: regionCode,
          geographyName: REGION_NAMES[regionCode],
          atecoVersion: ATECO_VERSION,
          sectorCode,
          sectorLabel: displaySectorLabel(categoryLabel(dataset, "ateco2025", sectorCode), sectorCode),
          metric: "active_enterprises",
          period: period.id,
          value: numericValue(readJsonStatValue(dataset, {
            metric: "V11910",
            geo: sourceRegionCode,
            ateco2025: sectorCode,
            time: categoryCodes(dataset, "time").find((code) => categoryLabel(dataset, "time", code) === period.id),
          })),
          sourceId: "active-stock",
        });
      }
    }
  }

  return {
    observations,
    periods,
    updatedAt: dataset.updated,
    regions: sourceRegions.map((sourceRegionCode) => {
      const code = REGION_CODES[sourceRegionCode];
      return { code, name: REGION_NAMES[code], sourceCode: sourceRegionCode };
    }),
    sectors: sectors.map((code) => ({
      code,
      label: displaySectorLabel(categoryLabel(dataset, "ateco2025", code), code),
    })),
  };
}

function workforceLevelScore(row) {
  return (row.classe?.length ?? 0) + (row.sottocategoria?.length ?? 0);
}

function normalizeWorkforce(csv, sectorLabels = new Map()) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const expectedHeader = "Regione;Provincia;Settore;Divisione;Classe;Sottocategoria;Addetti;Localizzazioni Attive";
  if (header !== expectedHeader) throw new Error(`Intestazione CSV inattesa: ${header}`);

  const canonicalByDivision = new Map();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [sourceRegion, province, sectorCode, division, classe, sottocategoria, employees, localUnits] = line.split(";");
    const regionCode = REGION_SOURCE_NAMES[sourceRegion];
    if (!regionCode || !/^[A-Z]$/.test(sectorCode) || !division || !province) continue;
    const row = {
      regionCode,
      province,
      sectorCode,
      division,
      classe,
      sottocategoria,
      employees: numericValue(employees),
      localUnits: numericValue(localUnits),
    };
    const key = [regionCode, province, sectorCode, division].join("|");
    const previous = canonicalByDivision.get(key);
    if (!previous || workforceLevelScore(row) < workforceLevelScore(previous)) {
      canonicalByDivision.set(key, row);
    }
  }

  const aggregate = new Map();
  for (const row of canonicalByDivision.values()) {
    const key = [row.regionCode, row.sectorCode].join("|");
    const current = aggregate.get(key) ?? {
      regionCode: row.regionCode,
      sectorCode: row.sectorCode,
      employees: null,
      localUnits: null,
    };
    current.employees = addNullable(current.employees, row.employees);
    current.localUnits = addNullable(current.localUnits, row.localUnits);
    aggregate.set(key, current);
  }

  const observations = [];
  for (const row of aggregate.values()) {
    const sectorLabel = sectorLabels.get(row.sectorCode) ?? row.sectorCode;
    for (const [metric, value] of [["employees", row.employees], ["active_local_units", row.localUnits]]) {
      observations.push({
        observationType: "aggregate",
        geographyLevel: "region",
        geographyCode: row.regionCode,
        geographyName: REGION_NAMES[row.regionCode],
        atecoVersion: ATECO_VERSION,
        sectorCode: row.sectorCode,
        sectorLabel,
        metric,
        period: "2026-Q2",
        value,
        sourceId: "workforce",
      });
    }
  }
  return { observations, updatedAt: "2026-08-04", rowsRead: lines.length };
}

function normalizeProductionValue(dataset) {
  const sourceRegions = dataset.dimension.geo.category.child.IT;
  const sectors = categoryCodes(dataset, "ateco2025").filter((code) => code !== "TOTAL");
  const bands = categoryCodes(dataset, "productionvalue").map((code) => ({
    code,
    label: categoryLabel(dataset, "productionvalue", code),
  }));
  const timeCode = categoryCodes(dataset, "time")[0];
  const period = categoryLabel(dataset, "time", timeCode);
  const observations = [];

  for (const sourceRegionCode of sourceRegions) {
    const regionCode = REGION_CODES[sourceRegionCode];
    if (!regionCode) throw new Error(`Regione JSON-stat non mappata: ${sourceRegionCode}`);
    for (const sectorCode of sectors) {
      for (const band of bands) {
        observations.push({
          observationType: "aggregate",
          geographyLevel: "region",
          geographyCode: regionCode,
          geographyName: REGION_NAMES[regionCode],
          atecoVersion: ATECO_VERSION,
          sectorCode,
          sectorLabel: displaySectorLabel(categoryLabel(dataset, "ateco2025", sectorCode), sectorCode),
          metric: "production_value_band_count",
          period,
          value: numericValue(readJsonStatValue(dataset, {
            metric: "V11910",
            geo: sourceRegionCode,
            ateco2025: sectorCode,
            productionvalue: band.code,
            time: timeCode,
          })),
          bandCode: band.code,
          bandLabel: band.label,
          sourceId: "production-value",
        });
      }
    }
  }

  return { observations, bands, period, updatedAt: dataset.updated };
}

function validateSnapshot(snapshot) {
  if (snapshot.schemaVersion !== 1) throw new Error("schemaVersion non supportata");
  if (snapshot.observationType !== "aggregate") throw new Error("Il POC accetta soltanto aggregati");
  if (snapshot.observations.length < 10_000) throw new Error("Snapshot troppo piccolo: possibile perdita di righe");
  const sourceIds = new Set(snapshot.observations.map((row) => row.sourceId));
  if (sourceIds.size !== 3 || !["active-stock", "workforce", "production-value"].every((id) => sourceIds.has(id))) {
    throw new Error("Lo snapshot deve contenere esattamente le tre fonti dichiarate");
  }
  const observationKeys = new Set();
  for (const row of snapshot.observations) {
    if (row.observationType !== "aggregate" || row.geographyLevel !== "region") {
      throw new Error("Trovata un’osservazione fuori dal perimetro aggregato regionale");
    }
    if (row.value !== null && (!Number.isInteger(row.value) || row.value < 0)) {
      throw new Error("Valore osservazione non intero o negativo");
    }
    const key = [row.sourceId, row.metric, row.period, row.geographyCode, row.sectorCode, row.bandCode ?? ""].join("|");
    if (observationKeys.has(key)) throw new Error(`Osservazione duplicata: ${key}`);
    observationKeys.add(key);
  }
}

export async function buildSnapshot() {
  const [activeStock, workforceCsv, productionValue] = await Promise.all([
    fetchJson(SOURCE_URLS.activeStock),
    fetchText(SOURCE_URLS.workforce),
    fetchJson(SOURCE_URLS.productionValue),
  ]);
  const active = normalizeActiveStock(activeStock);
  const sectorLabels = new Map(active.sectors.map((sector) => [sector.code, sector.label]));
  const workforce = normalizeWorkforce(workforceCsv, sectorLabels);
  const production = normalizeProductionValue(productionValue);
  const snapshot = {
    schemaVersion: 1,
    generatedAt: OBSERVED_AT,
    observationType: "aggregate",
    geographyVersion: "regioni ISTAT allineate ai codici territoriali usati dalla fonte",
    atecoVersion: ATECO_VERSION,
    sources: {
      "active-stock": sourceRecord({
        id: "active-stock",
        label: "Imprese attive · stock mensile",
        url: SOURCE_URLS.activeStock,
        updatedAt: active.updatedAt,
        cadence: "mensile",
        coverage: "Sedi di impresa attive per regione, settore ATECO 2025 e mese; ultimo periodo 31/07/2026.",
        caveat: "Conta sedi di impresa attive, non ricavi e non gruppi societari.",
      }),
      workforce: sourceRecord({
        id: "workforce",
        label: "Addetti e localizzazioni attive · trimestre",
        url: SOURCE_URLS.workforce,
        updatedAt: "2026-08-04",
        cadence: "trimestrale",
        coverage: "Addetti e localizzazioni attive aggregati dalle righe provinciali al livello regionale e di sezione ATECO.",
        caveat: "Il CSV è gerarchico: il refresh seleziona una sola riga canonica per divisione e provincia per evitare doppio conteggio.",
      }),
      "production-value": sourceRecord({
        id: "production-value",
        label: "Fasce di valore della produzione · bilanci",
        url: SOURCE_URLS.productionValue,
        updatedAt: production.updatedAt,
        cadence: "annuale",
        coverage: "Numero di sedi attive obbligate al deposito del bilancio per fascia, regione e settore; periodo 31/12/2025.",
        caveat: "Il valore della produzione non è fatturato o ricavi esatti; la fonte lo deriva dai bilanci depositati.",
      }),
    },
    periods: {
      activeStock: active.periods,
      workforce: [{ id: "2026-Q2", label: "2° trimestre 2026" }],
      productionValue: [{ id: production.period, label: production.period }],
    },
    regions: active.regions.map(({ code, name }) => ({ code, name })),
    sectors: active.sectors,
    productionBands: production.bands,
    observations: [...active.observations, ...workforce.observations, ...production.observations],
    coverage: {
      activeStockObservations: active.observations.length,
      workforceRowsRead: workforce.rowsRead,
      workforceObservations: workforce.observations.length,
      productionValueObservations: production.observations.length,
    },
  };
  validateSnapshot(snapshot);
  return snapshot;
}

async function main() {
  if (process.argv.includes("--check")) {
    const snapshot = JSON.parse(await readFile(OUTPUT, "utf8"));
    validateSnapshot(snapshot);
    console.log(`OK ${OUTPUT}: ${snapshot.observations.length} osservazioni aggregate`);
    return;
  }
  const snapshot = await buildSnapshot();
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Scritto ${OUTPUT}: ${snapshot.observations.length} osservazioni aggregate`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
