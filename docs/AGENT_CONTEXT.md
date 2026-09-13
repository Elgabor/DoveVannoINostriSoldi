# Contesto per gli agenti

Mappa per attività: ogni sezione dice quando serve, le fonti iniziali davvero
pertinenti, gli invarianti particolari e dove stanno i controlli. Una task
trasversale legge l'unione delle sezioni pertinenti. Per una task non elencata,
cerca percorsi e contratti reali e dichiara l'incertezza invece di classificare
a caso.

## Ingresso

- **Quando serve**: solo se la task appartiene a un dominio mappato; leggi la
  sezione pertinente, non tutta la mappa. Per una task non mappata non usare
  questa mappa come ingresso: parti da
  [docs/ARCHITECTURE.md](ARCHITECTURE.md) per i percorsi del dato e da
  [CONTRIBUTING.md](../CONTRIBUTING.md) per setup, test e gate.
- **Selezione**: una task trasversale legge solo l'unione delle sezioni
  pertinenti; in questa fase l'unica sezione disponibile è «MCP e API».
- **Invariante**: non leggere tutti i documenti del repository; apri soltanto la
  sezione pertinente e, da lì, le fonti che elenca.

## MCP e API

- **Quando serve**: per modificare o verificare il server MCP (`src/lib/mcp/`),
  il contratto condiviso delle query o il comportamento di `/api/mcp`.
- **Fonti iniziali**:
  - [src/lib/mcp/query-schema.ts](../src/lib/mcp/query-schema.ts): schema
    `datasetQuerySchema` condiviso tra MCP e assistente.
  - [src/lib/mcp/catalog.ts](../src/lib/mcp/catalog.ts): `datasetCatalog` con i
    soli dataset `active`, filtri ammessi, cautele, fonti e `exampleQuery`.
  - [src/lib/mcp/datasets.ts](../src/lib/mcp/datasets.ts): dispatcher
    `queryPublicDataset` e i rami per dataset.
  - [src/lib/mcp/server.ts](../src/lib/mcp/server.ts): registrazione dei tool
    `list_datasets` e `query_dataset` e delle resource.
  - [docs/MCP.md](MCP.md): contratto pubblico, semantica e procedura per nuove
    fonti.
- **Percorso tipico**: per cambiare un filtro leggi prima query-schema e catalogo,
  poi segui il ramo del dataset in `queryPublicDataset`.
- **Confine**: `/api/dati/[dataset]` è il corpus integrato, non un ID del catalogo
  MCP. Non inventare equivalenze fra i due namespace.
- **Validazione e provenance**: lo schema e il catalogo respingono filtri non
  dichiarati; i rami riusano i moduli di dominio senza duplicare fetch o
  normalizzazione. Zero, dato mancante e cella oscurata restano distinti.
- **Test mirati** (percorsi, non lettura obbligatoria):
  `tests/mcp-datasets.test.mjs`, `tests/mcp-route.test.mjs`,
  `tests/mcp-deadline.test.mjs`.
