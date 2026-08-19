const IPA_DATASTORE_SEARCH =
  "https://indicepa.gov.it/ipa-dati/api/3/action/datastore_search";

export const IPA_ENTI_RESOURCE_ID = "d09adf99-dc10-4349-8c53-27b1e5aa97b6";
export const IPA_ENTI_DATASET_URL = "https://www.indicepa.gov.it/ipa-dati/dataset/enti";
export const IPA_LICENSE = "CC BY 4.0";

const USER_AGENT =
  "TrasparenzaItalia/0.2 (+https://github.com/metaforismo/trasparenzaitalia)";

export type IpaEntity = {
  codiceIpa: string;
  denominazione: string;
  codiceFiscale: string | null;
  tipologia: string | null;
  codiceCategoria: string | null;
  codiceNatura: string | null;
  codiceAteco: string | null;
  inLiquidazione: boolean | null;
  codiceMiur: string | null;
  codiceIstat: string | null;
  acronimo: string | null;
  responsabile: {
    nome: string | null;
    cognome: string | null;
    titolo: string | null;
  };
  sede: {
    codiceComuneIstat: string | null;
    codiceCatastaleComune: string | null;
    cap: string | null;
    indirizzo: string | null;
  };
  email: Array<{
    indirizzo: string;
    tipo: string | null;
  }>;
  sitoIstituzionale: string | null;
  social: {
    facebook: string | null;
    linkedin: string | null;
    twitter: string | null;
    youtube: string | null;
  };
  dataAggiornamento: string | null;
};

type IpaRawEntity = {
  Codice_IPA?: unknown;
  Denominazione_ente?: unknown;
  Codice_fiscale_ente?: unknown;
  Tipologia?: unknown;
  Codice_Categoria?: unknown;
  Codice_natura?: unknown;
  Codice_ateco?: unknown;
  Ente_in_liquidazione?: unknown;
  Codice_MIUR?: unknown;
  Codice_ISTAT?: unknown;
  Acronimo?: unknown;
  Nome_responsabile?: unknown;
  Cognome_responsabile?: unknown;
  Titolo_responsabile?: unknown;
  Codice_comune_ISTAT?: unknown;
  Codice_catastale_comune?: unknown;
  CAP?: unknown;
  Indirizzo?: unknown;
  Mail1?: unknown;
  Tipo_Mail1?: unknown;
  Mail2?: unknown;
  Tipo_Mail2?: unknown;
  Mail3?: unknown;
  Tipo_Mail3?: unknown;
  Mail4?: unknown;
  Tipo_Mail4?: unknown;
  Mail5?: unknown;
  Tipo_Mail5?: unknown;
  Sito_istituzionale?: unknown;
  Url_facebook?: unknown;
  Url_linkedin?: unknown;
  Url_twitter?: unknown;
  Url_youtube?: unknown;
  Data_aggiornamento?: unknown;
  [key: string]: unknown;
};

type CkanDatastoreResponse = {
  success?: boolean;
  result?: {
    total?: number;
    records?: IpaRawEntity[];
  };
};

export type IpaSearchResult = {
  total: number;
  records: IpaEntity[];
  observedAt: string;
  sourceUrl: string;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function requiredText(value: unknown, fallback: string): string {
  return text(value) ?? fallback;
}

function liquidazione(value: unknown): boolean | null {
  const normalized = text(value)?.toUpperCase();
  if (normalized === "S") return true;
  if (normalized === "N") return false;
  return null;
}

function externalUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeEntity(record: IpaRawEntity): IpaEntity {
  const email: IpaEntity["email"] = [];

  for (let index = 1; index <= 5; index += 1) {
    const indirizzo = text(record[`Mail${index}`]);
    if (!indirizzo) continue;

    email.push({
      indirizzo,
      tipo: text(record[`Tipo_Mail${index}`]),
    });
  }

  return {
    codiceIpa: requiredText(record.Codice_IPA, "codice-ipa-non-disponibile"),
    denominazione: requiredText(record.Denominazione_ente, "Denominazione non disponibile"),
    codiceFiscale: text(record.Codice_fiscale_ente),
    tipologia: text(record.Tipologia),
    codiceCategoria: text(record.Codice_Categoria),
    codiceNatura: text(record.Codice_natura),
    codiceAteco: text(record.Codice_ateco),
    inLiquidazione: liquidazione(record.Ente_in_liquidazione),
    codiceMiur: text(record.Codice_MIUR),
    codiceIstat: text(record.Codice_ISTAT),
    acronimo: text(record.Acronimo),
    responsabile: {
      nome: text(record.Nome_responsabile),
      cognome: text(record.Cognome_responsabile),
      titolo: text(record.Titolo_responsabile),
    },
    sede: {
      codiceComuneIstat: text(record.Codice_comune_ISTAT),
      codiceCatastaleComune: text(record.Codice_catastale_comune),
      cap: text(record.CAP),
      indirizzo: text(record.Indirizzo),
    },
    email,
    sitoIstituzionale: externalUrl(record.Sito_istituzionale),
    social: {
      facebook: externalUrl(record.Url_facebook),
      linkedin: externalUrl(record.Url_linkedin),
      twitter: externalUrl(record.Url_twitter),
      youtube: externalUrl(record.Url_youtube),
    },
    dataAggiornamento: text(record.Data_aggiornamento),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(Math.max(Math.trunc(value), minimum), maximum);
}

async function datastoreRequest(params: URLSearchParams): Promise<IpaSearchResult> {
  params.set("resource_id", IPA_ENTI_RESOURCE_ID);

  const url = `${IPA_DATASTORE_SEARCH}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    throw new Error(`IPA upstream HTTP ${response.status}`);
  }

  const payload = (await response.json()) as CkanDatastoreResponse;

  if (!payload.success || !payload.result || !Array.isArray(payload.result.records)) {
    throw new Error("Risposta IPA non valida");
  }

  return {
    total: typeof payload.result.total === "number" ? payload.result.total : 0,
    records: payload.result.records.map(normalizeEntity),
    observedAt: new Date().toISOString(),
    sourceUrl: url,
  };
}

export async function searchIpaEntities(options: {
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<IpaSearchResult> {
  const params = new URLSearchParams();
  params.set("limit", String(clamp(options.limit ?? 20, 0, 100)));
  params.set("offset", String(clamp(options.offset ?? 0, 0, 1_000_000)));

  const query = options.query?.trim();
  if (query) params.set("q", query.slice(0, 180));

  return datastoreRequest(params);
}

export async function getIpaEntityByCode(codiceIpa: string): Promise<IpaEntity | null> {
  const normalized = codiceIpa.trim().slice(0, 100);
  if (!normalized) return null;

  const params = new URLSearchParams({
    limit: "1",
    filters: JSON.stringify({ Codice_IPA: normalized }),
  });

  const result = await datastoreRequest(params);
  return result.records[0] ?? null;
}

export async function getIpaRegistryStats(): Promise<{
  total: number;
  observedAt: string;
}> {
  const result = await searchIpaEntities({ limit: 0 });
  return { total: result.total, observedAt: result.observedAt };
}
