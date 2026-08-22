#!/usr/bin/env python3
"""Build the compact 2025 Ministries snapshot from the official RGS CSV."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "src/data/generated/rgs-ministries-2025.data.json"
META_PATH = ROOT / "src/data/generated/rgs-ministries-2025.meta.json"
LANDING_URL = "https://bdap-opendata.rgs.mef.gov.it/content/2025-rendiconto-pubblicato-elaborabile-spese-capitolo?metadati=showall"
RESOURCE_URL = "https://bdap-opendata.rgs.mef.gov.it/export/csv/2025---Rendiconto-Pubblicato-Elaborabile-Spese-Capitolo.csv"
SOURCE_RECORD_ID = "2025_RND_SPE_ELB_CAP_001"
EXPECTED_BYTES = 4_196_648
EXPECTED_SHA256 = "2887db4905d30445abc795083f2861f969173baf235a56917932c9fcc242e368"
EXPECTED_ROWS = 5_395
EXPECTED_HEADERS = (
    "Esercizio Finanziario", "Stato di Previsione", "Amministrazione",
    "Unità di voto 1° livello", "Unità di voto 2° livello", "Numero Capitolo di Spesa",
    "Capitolo di Spesa", "Codice Titolo", "Titolo", "Codice Categoria", "Categoria",
    "Codice Puntato CE", "Codice Missione", "Missione", "Codice Programma", "Programma",
    "Codice Centro Responsabilità", "Centro Responsabilità", "Codice Azione", "Azione",
    "Previsioni Iniziali RS", "Previsioni Iniziali CP", "Previsioni Iniziali CS",
    "Variazioni RS", "Variazioni CP", "Variazioni CS", "Previsioni Definitive RS",
    "Previsioni Definitive CP", "Previsioni Definitive CS", "Pagato RS", "Pagato CP",
    "Pagato CS", "Rimasto da Pagare RS", "Rimasto da Pagare CP", "Totale RS", "Totale CP",
    "Totale CS", "Economie-Maggiori Spese RS", "Economie-Maggiori Spese CP",
    "Economie-Maggiori Spese CS", "RS al 31/12",
)
MONEY_HEADERS = EXPECTED_HEADERS[20:]


def fetch() -> bytes:
    request = urllib.request.Request(RESOURCE_URL, headers={"User-Agent": "DoveVannoINostriSoldi/0.2 source-verifier"})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise ValueError(f"HTTP inatteso {response.status}")
        return response.read()


def decimal_value(row: dict[str, str], field: str) -> Decimal:
    try:
        return Decimal(row[field])
    except Exception as error:
        raise ValueError(f"Importo RGS non numerico in {field}: {row.get(field)!r}") from error


def cents(value: Decimal) -> int:
    return int((value * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def close(left: Decimal, right: Decimal) -> bool:
    return abs(left - right) <= Decimal("0.01")


def parse(payload: bytes) -> list[dict[str, str]]:
    if len(payload) != EXPECTED_BYTES or hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
        raise ValueError("Asset RGS diverso dal file validato")
    text = payload.decode("cp1252", errors="strict")
    reader = csv.DictReader(io.StringIO(text), delimiter=";", quotechar='"')
    if tuple(reader.fieldnames or ()) != EXPECTED_HEADERS:
        raise ValueError("Schema RGS inatteso: intestazioni cambiate")
    rows = list(reader)
    if len(rows) != EXPECTED_ROWS:
        raise ValueError(f"Copertura RGS inattesa: {len(rows)} righe")
    return rows


def validate_row(row: dict[str, str]) -> None:
    for field in MONEY_HEADERS:
        decimal_value(row, field)
    identities = (
        ("Previsioni Definitive RS", "Previsioni Iniziali RS", "Variazioni RS"),
        ("Previsioni Definitive CP", "Previsioni Iniziali CP", "Variazioni CP"),
        ("Previsioni Definitive CS", "Previsioni Iniziali CS", "Variazioni CS"),
        ("Pagato CS", "Pagato CP", "Pagato RS"),
        ("Totale RS", "Pagato RS", "Rimasto da Pagare RS"),
        ("Totale CP", "Pagato CP", "Rimasto da Pagare CP"),
        ("RS al 31/12", "Rimasto da Pagare CP", "Rimasto da Pagare RS"),
    )
    for total, first, second in identities:
        if not close(decimal_value(row, total), decimal_value(row, first) + decimal_value(row, second)):
            raise ValueError(f"Identità RGS non riconciliata: {total}")
    if not close(decimal_value(row, "Totale CS"), decimal_value(row, "Pagato CS")):
        raise ValueError("Identità RGS non riconciliata: Totale CS")
    for frame in ("RS", "CP", "CS"):
        if not close(
            decimal_value(row, f"Economie-Maggiori Spese {frame}"),
            decimal_value(row, f"Totale {frame}") - decimal_value(row, f"Previsioni Definitive {frame}"),
        ):
            raise ValueError(f"Identità RGS non riconciliata: economie {frame}")


def canonical_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()


def build_snapshot(payload: bytes, acquired_at: str) -> tuple[dict, dict]:
    rows = parse(payload)
    ministries: dict[tuple[str, str], dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    missions: dict[tuple[str, str, str, str], dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for row in rows:
        validate_row(row)
        if row["Esercizio Finanziario"] != "2025":
            raise ValueError("Esercizio RGS inatteso")
        ministry = (row["Stato di Previsione"], row["Amministrazione"])
        mission = (*ministry, row["Codice Missione"], row["Missione"])
        for field in ("Totale CP", "Pagato CP", "Pagato RS", "Pagato CS", "Rimasto da Pagare CP", "Rimasto da Pagare RS", "RS al 31/12"):
            value = decimal_value(row, field)
            ministries[ministry][field] += value
            missions[mission][field] += value
    if len(ministries) != 15 or {code for code, _ in ministries} != {f"{value:02d}" for value in range(2, 17)}:
        raise ValueError("Identità delle 15 amministrazioni RGS inattesa")

    ministry_rows = []
    for (code, label), values in ministries.items():
        mission_rows = [
            {
                "code": mission_code,
                "label": mission_label,
                "commitmentsCpCents": cents(mission_values["Totale CP"]),
                "paymentsCashCsCents": cents(mission_values["Pagato CS"]),
            }
            for (ministry_code, _, mission_code, mission_label), mission_values in missions.items()
            if ministry_code == code
        ]
        mission_rows.sort(key=lambda item: (-item["commitmentsCpCents"], item["code"]))
        ministry_rows.append({
            "code": code,
            "label": label,
            "commitmentsCpCents": cents(values["Totale CP"]),
            "paymentsCompetenceCpCents": cents(values["Pagato CP"]),
            "paymentsResidualRsCents": cents(values["Pagato RS"]),
            "paymentsCashCsCents": cents(values["Pagato CS"]),
            "remainingCpCents": cents(values["Rimasto da Pagare CP"]),
            "remainingRsCents": cents(values["Rimasto da Pagare RS"]),
            "residualsEndCents": cents(values["RS al 31/12"]),
            "missions": mission_rows,
        })
    ministry_rows.sort(key=lambda item: (-item["commitmentsCpCents"], item["code"]))

    totals = {
        key: sum(item[key] for item in ministry_rows)
        for key in (
            "commitmentsCpCents", "paymentsCompetenceCpCents", "paymentsResidualRsCents",
            "paymentsCashCsCents", "remainingCpCents", "remainingRsCents", "residualsEndCents",
        )
    }
    if totals["paymentsCashCsCents"] != totals["paymentsCompetenceCpCents"] + totals["paymentsResidualRsCents"]:
        raise ValueError("Pagamenti CS aggregati non riconciliati")
    if totals["commitmentsCpCents"] != totals["paymentsCompetenceCpCents"] + totals["remainingCpCents"]:
        raise ValueError("Totale CP aggregato non riconciliato")
    if totals["residualsEndCents"] != totals["remainingCpCents"] + totals["remainingRsCents"]:
        raise ValueError("Residui finali aggregati non riconciliati")

    data = {
        "schemaVersion": 1,
        "referenceYear": 2025,
        "unit": "euro_cents",
        "totals": totals,
        "ministries": ministry_rows,
        "coverage": {"sourceRows": len(rows), "headers": len(EXPECTED_HEADERS), "ministries": len(ministry_rows), "rowsReconciled": len(rows)},
        "definitions": {
            "commitmentsCp": "Impegni di competenza: pagato CP più rimasto da pagare CP.",
            "paymentsCashCs": "Pagamenti di cassa: pagato CP più pagato su residui RS.",
            "residualsEnd": "Residui al 31 dicembre: rimasto CP più rimasto RS.",
            "notAdditive": "Impegni, pagamenti e residui descrivono fasi diverse e non vanno sommati.",
        },
    }
    data_bytes = canonical_bytes(data)
    meta = {
        "schemaVersion": 1,
        "source": {
            "owner": "Ragioneria Generale dello Stato",
            "landingUrl": LANDING_URL,
            "resourceUrl": RESOURCE_URL,
            "sourceRecordId": SOURCE_RECORD_ID,
            "referencePeriod": "2025",
            "createdAt": "2026-05-28",
            "updatedAt": "2026-07-14",
            "acquiredAt": acquired_at,
            "format": "csv",
            "licenseStatus": "declared",
            "licenseName": "CC BY 3.0",
        },
        "asset": {"bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest(), "encoding": "cp1252", "delimiter": ";"},
        "transformation": {"version": 1, "description": "41 colonne validate; 5.395 righe riconciliate e aggregate per Ministero e missione senza mescolare CP, RS e CS."},
        "dataArtifact": {"path": str(DATA_PATH.relative_to(ROOT)), "bytes": len(data_bytes), "sha256": hashlib.sha256(data_bytes).hexdigest()},
    }
    return data, meta


def validate_committed() -> None:
    data_bytes = DATA_PATH.read_bytes()
    data = json.loads(data_bytes)
    meta = json.loads(META_PATH.read_text())
    artifact = meta["dataArtifact"]
    if len(data_bytes) != artifact["bytes"] or hashlib.sha256(data_bytes).hexdigest() != artifact["sha256"]:
        raise ValueError("Artefatto Ministeri non legato al manifesto")
    if data["coverage"] != {"sourceRows": EXPECTED_ROWS, "headers": 41, "ministries": 15, "rowsReconciled": EXPECTED_ROWS}:
        raise ValueError("Copertura Ministeri inattesa")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path)
    parser.add_argument("--acquired-at")
    parser.add_argument("--validate-committed", action="store_true")
    args = parser.parse_args()
    if args.validate_committed:
        validate_committed()
        return
    payload = args.input.read_bytes() if args.input else fetch()
    acquired_at = args.acquired_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    data, meta = build_snapshot(payload, acquired_at)
    DATA_PATH.write_bytes(canonical_bytes(data))
    META_PATH.write_bytes(canonical_bytes(meta))


if __name__ == "__main__":
    main()
