# Third-party data notices

The MIT license in `LICENSE` applies to the project code. Embedded or linked datasets keep their original licenses and attribution requirements.

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
