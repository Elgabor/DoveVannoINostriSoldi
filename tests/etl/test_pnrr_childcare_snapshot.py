import csv
import hashlib
import importlib.util
import json
import tempfile
import unittest
from unittest import mock
from pathlib import Path

MODULE_PATH = Path(__file__).parents[2] / "scripts/etl/pnrr_childcare_snapshot.py"
SPEC = importlib.util.spec_from_file_location("pnrr_childcare_snapshot", MODULE_PATH)
assert SPEC and SPEC.loader
etl = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(etl)


class PnrrChildcareSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.paths = {key: self.root / f"{key}.csv" for key in ("projects", "locations", "tenders", "awardees")}
        cup = "A12345678901234"
        submeasure = "M4C1I1.01.00"

        project = {key: "" for key in etl.PROJECT_HEADERS}
        project.update({
            "Codice Univoco Submisura": submeasure,
            "CUP": cup,
            "Codice Locale Progetto": "LOCAL-1",
            "Titolo Progetto": "Nuovo asilo comunale",
            "Finanziamento PNRR": "1000,50",
            "Finanziamento Totale": "1250,50",
            "Finanziamento Totale Pubblico Netto": "1250,50",
            "Soggetto Attuatore": "Comune prova",
            "Data Inizio Progetto Prevista": "01/01/2025",
            "Data Fine Progetto Prevista": "31/12/2026",
            "Data di Estrazione": "13/06/2026",
            "Data Ultima Validazione": "12/06/2026",
            "Esito Ultima Validazione": "Validato",
        })
        location = {key: "" for key in etl.LOCATION_HEADERS}
        location.update({
            "Codice Univoco Submisura": submeasure,
            "CUP": cup,
            "Regione": "12",
            "Descrizione Regione": "Lazio",
            "Provincia": "058",
            "Descrizione Provincia": "Roma",
            "Comune": "058091",
            "Descrizione Comune": "Roma",
            "Percentuale di Localizzazione": "100,00",
            "Data di Estrazione": "13/06/2026",
        })
        tender = {key: "" for key in etl.TENDER_HEADERS}
        tender.update({
            "Codice Univoco Submisura": submeasure,
            "CUP": cup,
            "CIG": "123456789A",
            "Codice Interno PDA": "PDA-1",
            "Codice Procedura Utente": "PROC-1",
            "Oggetto Gara": "Lavori asilo",
            "Importo Complessivo Gara": "900,00",
            "Importo Aggiudicazione": "800,00",
            "Data Pubblicazione del CIG": "00/01/1900",
            "Data Aggiudicazione Definitiva": "################################################################",
            "Data di Estrazione": "13/06/2026",
        })
        awardee = {key: "" for key in etl.AWARDEE_HEADERS}
        awardee.update({
            "Codice Univoco Submisura": submeasure,
            "CUP": cup,
            "CIG": "123456789A",
            "Codice interno PDA": "PDA-1",
            "Codice Procedura Utente": "PROC-1",
            "Codice Fiscale/P.IVA": "01234567890",
            "Denominazione Aggiudicatario": "Impresa prova",
            "Data di Estrazione": "13/06/2026",
        })
        for key, headers, row in (
            ("projects", etl.PROJECT_HEADERS, project),
            ("locations", etl.LOCATION_HEADERS, location),
            ("tenders", etl.TENDER_HEADERS, tender),
            ("awardees", etl.AWARDEE_HEADERS, awardee),
        ):
            with self.paths[key].open("w", encoding="utf-8-sig", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=sorted(headers), delimiter=";")
                writer.writeheader()
                writer.writerow(row)

        assets = {}
        for key, path in self.paths.items():
            payload = path.read_bytes()
            assets[key] = {
                "fileName": path.name,
                "url": f"https://www.italiadomani.gov.it/{path.name}",
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        self.spec = {
            "schemaVersion": 1,
            "datasetId": "pnrr_asili",
            "submeasure": {"code": submeasure, "label": "Asili"},
            "observedAt": "2026-08-21T00:00:00Z",
            "source": {
                "owner": "Italia Domani",
                "landingUrl": "https://www.italiadomani.gov.it/catalogo",
                "license": "CC BY 4.0",
                "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                "attribution": "Italia Domani",
                "assets": assets,
            },
            "expected": {
                "referenceDate": "2026-06-13",
                "projectRows": 1,
                "uniqueProjects": 1,
                "locationRows": 1,
                "tenderRows": 1,
                "awardeeRows": 1,
                "projectsWithLocations": 1,
                "projectsWithTenders": 1,
                "projectsWithAwardees": 1,
                "municipalities": 1,
                "unmatchedAwardeeRows": 0,
            },
            "artifactBudgetBytes": 100_000,
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_builds_exact_cup_cig_procedure_trace_and_preserves_missing_dates(self):
        data, meta = etl.build_snapshot(self.spec, self.paths, self.spec["observedAt"])
        project = data["projects"][0]
        self.assertEqual(project["funding"]["pnrrCents"], 100_050)
        self.assertEqual(project["tenders"][0]["publishedAt"], None)
        self.assertEqual(project["tenders"][0]["awardedAt"], None)
        self.assertEqual(project["awardees"][0]["cig"], project["tenders"][0]["cig"])
        self.assertEqual(meta["coverage"]["unmatchedAwardeeRows"], 0)
        self.assertEqual(meta["totals"]["awardAmountCents"], 80_000)

    def test_rejects_any_drift_from_the_locked_official_asset(self):
        self.paths["projects"].write_text("tampered", encoding="utf-8")
        with self.assertRaisesRegex(etl.StructuralError, "source lock non corrisponde"):
            etl.build_snapshot(self.spec, self.paths, self.spec["observedAt"])

    def test_generated_data_and_metadata_are_hash_bound(self):
        data, meta = etl.build_snapshot(self.spec, self.paths, self.spec["observedAt"])
        data_payload = etl.encoded_json(data, pretty=False)
        meta["integrity"]["dataArtifact"] = {
            "bytes": len(data_payload),
            "sha256": hashlib.sha256(data_payload).hexdigest(),
        }
        data_path = self.root / "data.json"
        meta_path = self.root / "meta.json"
        data_path.write_bytes(data_payload)
        meta_path.write_bytes(etl.encoded_json(meta, pretty=True))
        checked_data, checked_meta = etl.validate_artifacts(self.spec, data_path, meta_path)
        self.assertEqual(len(checked_data["projects"]), 1)
        self.assertEqual(checked_meta["integrity"]["dataArtifact"]["bytes"], len(data_payload))

    def test_atomic_pair_write_rolls_back_if_the_second_replace_fails(self):
        data_path = self.root / "pair.data.json"
        meta_path = self.root / "pair.meta.json"
        data_path.write_bytes(b"old-data")
        meta_path.write_bytes(b"old-meta")
        real_replace = etl.os.replace
        calls = 0

        def failing_replace(source, destination):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("second replace failed")
            return real_replace(source, destination)

        with mock.patch.object(etl.os, "replace", side_effect=failing_replace):
            with self.assertRaisesRegex(OSError, "second replace failed"):
                etl.write_artifacts_atomically(data_path, meta_path, b"new-data", b"new-meta")
        self.assertEqual(data_path.read_bytes(), b"old-data")
        self.assertEqual(meta_path.read_bytes(), b"old-meta")


if __name__ == "__main__":
    unittest.main()
