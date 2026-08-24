# Third-party data notices

The MIT license in `LICENSE` applies to the project code. Embedded or linked datasets keep their original licenses and attribution requirements.

## Consip participation and awardee data 2024–2026

- **Works:** annual Consip `Partecipazioni` records projected as the three
  awardee datasets `consip-winners-2024`, `consip-winners-2025` and
  `consip-winners-2026`;
- **Publisher:** Consip S.p.A.;
- **Source:** https://dati.consip.it/dataset/dataset-partecipazioni;
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0),
  https://creativecommons.org/licenses/by/4.0/;
- **Changes:** the selected annual rows are normalized into the common public
  JSONL contract; initiative, lot, instrument, participation form, role and
  award date remain distinct fields.

Attribution: `Consip S.p.A., dataset Partecipazioni 2024–2026, CC BY 4.0. Adapted by DoveVannoINostriSoldi.`

## RGS State accounts for consulting, 2024–2025

- **Works:** `2024/2025 - Rendiconto Pubblicato Elaborabile Spese - Piano di gestione`;
- **Publisher:** Ragioneria Generale dello Stato, Data Warehouse RGS;
- **Sources:** https://bdap-opendata.rgs.mef.gov.it/content/2024-rendiconto-pubblicato-elaborabile-spese-piano-di-gestione and https://bdap-opendata.rgs.mef.gov.it/content/2025-rendiconto-pubblicato-elaborabile-spese-piano-di-gestione;
- **License:** Creative Commons Attribution 3.0 (CC BY 3.0), as linked by
  each resource landing page;
- **Changes:** the official rows classified as consulting/analysis/studies or
  coordinated and continuous collaboration are selected; amounts are stored
  as integer cents and the accounting dimensions remain separate.

Attribution: `Ragioneria Generale dello Stato, Rendiconto Pubblicato Elaborabile Spese 2024–2025, CC BY 3.0. Adapted by DoveVannoINostriSoldi.`

## Italia Domani PNRR childcare data

- **Works:** `PNRR_Progetti.csv`, `PNRR_Localizzazione.csv`, `PNRR_Gare.csv` and `PNRR_Aggiudicatari_Gare.csv`, filtered to submeasure `M4C1I1.01.00`;
- **Publisher:** Presidenza del Consiglio dei Ministri, Italia Domani;
- **Source:** https://www.italiadomani.gov.it/content/sogei-ng/it/it/catalogo-open-data.html;
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/;
- **Changes:** the four official CSVs were filtered by exact submeasure code, monetary amounts were converted to integer cents, dates were normalized, and rows were linked by CUP, CIG and procedure identifiers. Missing links remain explicit.

Attribution: `Italia Domani, dati di attuazione del PNRR, submisura M4C1I1.01.00, CC BY 4.0. Adapted by DoveVannoINostriSoldi.`

## MEF municipal IRPEF data 2024

- **Work:** `Redditi e principali variabili IRPEF su base comunale`, anno d'imposta 2024, dichiarazioni 2025;
- **Publisher:** Ministero dell'Economia e delle Finanze, Dipartimento delle Finanze;
- **Source:** https://www1.finanze.gov.it/finanze/analisi_stat/public/index.php?opendata=yes;
- **License:** Creative Commons Attribution 3.0 (CC BY 3.0), as stated in the official methodology;
- **Changes:** selected declaration variables were converted from integer euro to integer cents; privacy-suppressed cells remain null; municipality values were aggregated to provinces and regions with the unassigned source row kept separate.

Attribution: `MEF – Dipartimento delle Finanze. Redditi e principali variabili IRPEF su base comunale, anno d'imposta 2024. CC BY 3.0. Adapted by DoveVannoINostriSoldi.`

## ISTAT administrative boundaries

`src/data/generated/italy-regions.ts` is an adapted, simplified representation of:

- **Work:** Confini delle unità amministrative a fini statistici al 1 gennaio 2026, versione generalizzata;
- **Publisher:** Istituto Nazionale di Statistica (ISTAT);
- **Source:** https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip;
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/;
- **Changes:** regional geometries were simplified and projected to static SVG paths by DoveVannoINostriSoldi; names and ISTAT region codes were preserved.

Attribution: `© Istituto Nazionale di Statistica (ISTAT), 2026. CC BY 4.0. Adapted by DoveVannoINostriSoldi.`

## OpenCivitas municipal data

- **Work:** Comuni, servizi totali, indicatori e determinanti 2022;
- **Publisher:** OpenCivitas, a Sogei project;
- **Source:** https://www.opencivitas.it/it/dataset/2022-comuni-servizi-totali-indicatori-e-determinanti;
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/;
- **Changes:** selected measures were normalized to integer cents and basis points, joined to official municipality metadata by ISTAT code, and supplied with derived differences and validation warnings.

Attribution: `OpenCivitas, Comuni - Servizi totali - Indicatori e determinanti 2022, CC BY 4.0. Adapted by DoveVannoINostriSoldi.`

## Consulenti Pubblici

- **Work:** national appointment statistics published through Consulenti Pubblici;
- **Publisher:** Dipartimento della Funzione Pubblica;
- **Source:** https://consulentipubblici.dfp.gov.it/progetto;
- **Reuse terms:** https://www.perlapa.gov.it/cd-note-legali.html;
- **Changes:** annual statistics were normalized, amounts were converted to integer cents, and source meanings and current-year limits were preserved.

Attribution: `Consulenti Pubblici, Dipartimento della Funzione Pubblica. Data adapted by DoveVannoINostriSoldi under the source reuse terms.`

## ANAC CIG 2025

- **Work:** twelve monthly CIG distributions for reference year 2025;
- **Publisher:** Autorità Nazionale Anticorruzione (ANAC);
- **Source:** https://dati.anticorruzione.it/opendata/dataset/cig-2025;
- **License:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/;
- **Changes:** the official monthly files were independently counted and reconciled into aggregate coverage and screening statistics; source URLs, sizes, modification dates and SHA-256 hashes are retained.

Attribution: `Autorità Nazionale Anticorruzione, CIG 2025, CC BY-SA 4.0. Aggregate analysis by DoveVannoINostriSoldi.`

## INPS civil-invalidity documents

- **Works:** official INPS annual accounts, management report material and statistical analysis listed in `src/data/generated/inps-civil-invalidity.json`;
- **Publisher:** Istituto Nazionale della Previdenza Sociale (INPS) and its Consiglio di Indirizzo e Vigilanza where indicated;
- **Source:** https://www.inps.it/it/it/dati-e-bilanci.html and the document-specific official URLs stored in the snapshot;
- **Reuse terms:** verify the terms applying to each institutional document before redistribution; the project does not present these documents as an IODL-licensed open dataset;
- **Changes:** selected national expenditure, benefit-stock and regional new-pension figures were transcribed into a reconciled structured snapshot. Measures with different scopes remain separate and no individual or medical data are included.

Attribution: `INPS institutional documents. Selected aggregate figures normalized by DoveVannoINostriSoldi; document-specific reuse terms apply.`

## OpenBDAP SSN Conto Economico 2024

- **Work:** `spd_ssn_cce_elb_voccn_01_2024`, `2024 - Modello di rilevazione del Conto Economico degli enti del SSN`;
- **Publisher:** Ragioneria Generale dello Stato, Data Warehouse RGS;
- **Source:** [entity landing](https://bdap-opendata.rgs.mef.gov.it/content/2024-modello-di-rilevazione-del-conto-economico-degli-enti-del-ssn), [national landing](https://bdap-opendata.rgs.mef.gov.it/content/2024-modello-di-rilevazione-del-conto-economico-degli-enti-del-ssn-livello-nazionale), [regional landing](https://bdap-opendata.rgs.mef.gov.it/content/2024-modello-di-rilevazione-del-conto-economico-degli-enti-del-ssn-livello-regionale), and [package metadata](https://bdap-opendata.rgs.mef.gov.it/SpodCkanApi/api/3/action/package_show?id=94083af2-a542-482d-8ad6-5877d04cd1ca);
- **License:** Creative Commons Attribution, catalog license identifier `cc-by`; the official metadata page links to [CC BY 3.0 Unported](https://creativecommons.org/licenses/by/3.0/);
- **Changes:** the three official inputs are validated against the source lock, amounts are converted from decimal euros to integer cents, and the national and regional aggregates remain separate from the 232-entity detail. The 21 entity rows with `codeSsn=999` are used only for anti-double-count reconciliation. The source nomenclature is preserved; “gettonisti” and “cooperative” are not inferred categories.

Attribution: `Ragioneria Generale dello Stato, Data Warehouse RGS. Conto Economico degli enti del SSN 2024, catalog license cc-by. Adapted by DoveVannoINostriSoldi.`

## Conti Pubblici Territoriali regional accounts

- **Works:** `EN_PA_CEMACRO` and `SP_PA_CEMACRO`, consolidated Public Administration revenue and expenditure series for 2000-2023;
- **Publisher:** Dipartimento per le Politiche di Coesione e per il Sud, Sistema Conti Pubblici Territoriali;
- **Source:** https://politichecoesione.governo.it/it/politica-di-coesione/misurazione-valutazione-e-trasparenza/la-misurazione-delle-politiche-di-coesione/conti-pubblici-territoriali-cpt/i-dati/catalogo-open-cpt/;
- **Reuse terms:** verify the license shown on each catalog resource; the general website terms do not override a resource-specific indication;
- **Changes:** matching revenue and expenditure totals were normalized to integer euro cents and combined as a territorial accounting balance. The balance is not presented as a fiscal residual.

Attribution: `Sistema Conti Pubblici Territoriali, consolidated PA revenue and expenditure 2000-2023. Adapted by DoveVannoINostriSoldi under the resource-specific terms.`

## ISTAT population at 31 December 2023

- **Work:** `Censimento e dinamica della popolazione - Anno 2023`;
- **Publisher:** Istituto Nazionale di Statistica (ISTAT);
- **Source:** https://www.istat.it/wp-content/uploads/2024/12/CENSIMENTO-E-DINAMICA-DELLA-POPOLAZIONE-2023.pdf;
- **Reuse terms:** verify the conditions applying to the specific document before redistribution;
- **Changes:** the 21 regional and autonomous-province population values were manually normalized, fingerprinted and used only as 2023 per-capita denominators for the CPT snapshot.

Attribution: `Istituto Nazionale di Statistica, Censimento e dinamica della popolazione 2023. Selected aggregate values normalized by DoveVannoINostriSoldi; source-specific reuse terms apply.`
