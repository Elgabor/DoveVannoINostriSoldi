import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts/etl/rgs_ministries_account.py"
SPEC = importlib.util.spec_from_file_location("rgs_ministries_account", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class RgsMinistriesAccountTests(unittest.TestCase):
    def test_parser_rejects_an_unlocked_asset(self):
        with self.assertRaisesRegex(ValueError, "diverso dal file validato"):
            MODULE.parse(b"not-the-official-csv")

    def test_row_reconciliation_rejects_mixed_frames(self):
        row = {field: "0.00" for field in MODULE.EXPECTED_HEADERS}
        row["Esercizio Finanziario"] = "2025"
        row["Pagato CS"] = "1.00"
        with self.assertRaisesRegex(ValueError, "Pagato CS"):
            MODULE.validate_row(row)

    def test_committed_snapshot_is_byte_bound(self):
        MODULE.validate_committed()


if __name__ == "__main__":
    unittest.main()
