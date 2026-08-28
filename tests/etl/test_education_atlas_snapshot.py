"""Fixture-level checks for the education atlas ETL contract."""

from __future__ import annotations

import copy
import csv
import io
import json
import unittest
from pathlib import Path

from scripts.etl import education_atlas_snapshot as etl


SNAPSHOT_PATH = Path(__file__).resolve().parents[2] / "src/data/generated/education-atlas-snapshot.json"


def csv_bytes(fields: tuple[str, ...], rows: list[dict[str, str]]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def student_row(**overrides: str) -> dict[str, str]:
    row = {
        "ANNOSCOLASTICO": "202425",
        "CODICESCUOLA": "ABC123",
        "ORDINESCUOLA": "SECONDARIA II GRADO",
        "ANNOCORSO": "1",
        "TIPOPERCORSO": "LICEO",
        "PERCORSO": "SCIENTIFICO",
        "INDIRIZZO": "SCIENTIFICO",
        "ALUNNIMASCHI": "1",
        "ALUNNIFEMMINE": "2",
    }
    row.update(overrides)
    return row


class EducationAtlasSnapshotETLTests(unittest.TestCase):
    def committed_snapshot(self) -> dict:
        return json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))

    def test_fixture_with_expected_schema_and_join_reconciles(self) -> None:
        students = etl.read_csv_bytes(
            csv_bytes(etl.STUDENT_FIELDS, [student_row()]),
            etl.STUDENT_FIELDS,
            "https://example.test/students.csv",
        )
        registry = etl.registry_map(
            [{"CODICESCUOLA": "ABC123", "REGIONE": "CAMPANIA"}],
            "https://example.test/registry.csv",
        )

        regional, pathways, addresses, coverage = etl.aggregate_source(
            period="202425",
            school_type="state",
            students=students,
            registry=registry,
            source_url="https://example.test/students.csv",
        )

        self.assertEqual(coverage["sourceRows"], 1)
        self.assertEqual(coverage["matchedRows"], 1)
        self.assertEqual(coverage["unmatchedRows"], 0)
        self.assertEqual(regional[0]["studentCount"], 3)
        self.assertEqual(pathways[0]["femaleCount"], 2)
        self.assertEqual(addresses[0]["maleCount"], 1)

    def test_modified_csv_schema_fails_closed(self) -> None:
        fields = (*etl.STUDENT_FIELDS[:-1], "ALUNNIFEMMINE_MODIFICATO")
        row = student_row()
        row["ALUNNIFEMMINE_MODIFICATO"] = row.pop("ALUNNIFEMMINE")
        with self.assertRaises(ValueError):
            etl.read_csv_bytes(
                csv_bytes(fields, [row]),
                etl.STUDENT_FIELDS,
                "https://example.test/students.csv",
            )

    def test_orphan_school_code_fails_closed(self) -> None:
        students = [student_row()]
        with self.assertRaisesRegex(ValueError, "non presente nell'anagrafe"):
            etl.aggregate_source(
                period="202425",
                school_type="state",
                students=students,
                registry={},
                source_url="https://example.test/students.csv",
            )

    def test_source_file_period_and_role_inventory_fails_closed(self) -> None:
        snapshot = self.committed_snapshot()

        incoherent_period = copy.deepcopy(snapshot)
        incoherent_period["sourceFiles"][0]["period"] = "202526"
        with self.assertRaises(ValueError):
            etl.assert_snapshot(incoherent_period)

        duplicate_role = copy.deepcopy(snapshot)
        duplicate_role["sourceFiles"][1]["role"] = "students"
        with self.assertRaises(ValueError):
            etl.assert_snapshot(duplicate_role)

    def test_duplicate_source_url_fails_closed_and_manifest_reconciles(self) -> None:
        snapshot = self.committed_snapshot()

        duplicate_url = copy.deepcopy(snapshot)
        duplicate_url["sourceFiles"][1]["url"] = duplicate_url["sourceFiles"][0]["url"]
        with self.assertRaises(ValueError):
            etl.assert_snapshot(duplicate_url)

        manifest = etl.source_file_manifest(snapshot, etl.DEFAULT_OUTPUT)
        etl.assert_source_file_manifest(manifest, snapshot)
        self.assertEqual(len(manifest["files"]), 12)


if __name__ == "__main__":
    unittest.main()
