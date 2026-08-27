import type { EducationAtlasSource } from "@/lib/education-atlas-contract";

/**
 * Provenance-only view used by the MCP catalog and source pages. Keep the
 * observations out of this module so catalog rendering does not parse the
 * multi-megabyte education snapshot.
 */
export const educationAtlasSources = {
  students: {
    id: "students",
    label: "Studenti della scuola secondaria di II grado per percorso e indirizzo",
    url: "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/ALUSECGRADOINDSTA20242520250831.csv",
    landingUrl: "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Studenti",
    publisher: "Ministero dell'Istruzione e del Merito",
    license: "IODL 2.0",
    updatedAt: "2026-02-23",
    observedAt: "2026-08-27T00:00:00+02:00",
    verifiedAt: "2026-08-27T00:00:00+02:00",
    cadence: "annuale",
    coverage: "Scuola secondaria di II grado; anno scolastico, tipo percorso, percorso, indirizzo e genere; statali e paritarie per il triennio 2022/23-2024/25.",
    caveat: "Il numero di studenti descrive la presenza nel file MIM e non misura qualità, esiti, domanda futura o disponibilità di lavoro.",
  },
  registry: {
    id: "registry",
    label: "Anagrafe delle scuole",
    url: "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/SCUANAGRAFESTAT20242520250831.csv",
    landingUrl: "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Scuole",
    publisher: "Ministero dell'Istruzione e del Merito",
    license: "IODL 2.0",
    updatedAt: "2026-06-18",
    observedAt: "2026-08-27T00:00:00+02:00",
    verifiedAt: "2026-08-27T00:00:00+02:00",
    cadence: "annuale",
    coverage: "Anagrafe delle sedi scolastiche usata per collegare i codici scuola ai territori senza pubblicare il dettaglio nominativo nel prodotto.",
    caveat: "Il join territoriale è tecnico: non rende comparabili automaticamente qualità, dotazioni o risultati delle scuole.",
  },
} as const satisfies Record<"students" | "registry", EducationAtlasSource>;

export const educationAtlasSourceList: readonly EducationAtlasSource[] = Object.freeze(
  Object.values(educationAtlasSources),
);
