#!/usr/bin/env python3
"""Build and validate the education module snapshot.

The source grain is one row per school code, course year, pathway and study
address. The public artifact deliberately rolls those rows up to region,
school type, pathway and address: it never publishes school names,
identifiers, emails or physical addresses.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
import unicodedata
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "src/data/generated/education-atlas-snapshot.json"
OBSERVED_AT_DEFAULT = "2026-08-27T00:00:00+02:00"

PERIODS = (
    ("202223", "2022/23"),
    ("202324", "2023/24"),
    ("202425", "2024/25"),
)
SCHOOL_TYPES = (("state", "Scuola statale"), ("paritaria", "Scuola paritaria"))

REGION_NAMES = {
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
}
REGION_CODES = tuple(REGION_NAMES)

REGION_SOURCE_LABELS = {
    "ABRUZZO": "13",
    "BASILICATA": "17",
    "CALABRIA": "18",
    "CAMPANIA": "15",
    "EMILIA ROMAGNA": "08",
    "FRIULI-VENEZIA G": "06",
    "LAZIO": "12",
    "LIGURIA": "07",
    "LOMBARDIA": "03",
    "MARCHE": "11",
    "MOLISE": "14",
    "PIEMONTE": "01",
    "PUGLIA": "16",
    "SARDEGNA": "20",
    "SICILIA": "19",
    "TOSCANA": "09",
    "UMBRIA": "10",
    "VENETO": "05",
}

PATHWAY_LABELS = {
    "ARTISTICO": "Artistico",
    "CLASSICO": "Classico",
    "ECONOMICO": "Economico",
    "EUROPEO": "Europeo",
    "INDUSTRIA E ARTIGIANATO": "Industria e artigianato",
    "INTERNAZIONALE": "Internazionale",
    "IEFP": "IeFP",
    "LINGUISTICO": "Linguistico",
    "MUSICALE E COREUTICO": "Musicale e coreutico",
    "NUOVI PROFESSIONALI": "Nuovi professionali",
    "SCIENTIFICO": "Scientifico",
    "SCIENZE UMANE": "Scienze umane",
    "SERVIZI": "Servizi",
    "TECNOLOGICO": "Tecnologico",
}

STUDENT_FIELDS = (
    "ANNOSCOLASTICO",
    "CODICESCUOLA",
    "ORDINESCUOLA",
    "ANNOCORSO",
    "TIPOPERCORSO",
    "PERCORSO",
    "INDIRIZZO",
    "ALUNNIMASCHI",
    "ALUNNIFEMMINE",
)
REGISTRY_FIELDS_STATE = (
    "ANNOSCOLASTICO",
    "AREAGEOGRAFICA",
    "REGIONE",
    "PROVINCIA",
    "CODICEISTITUTORIFERIMENTO",
    "DENOMINAZIONEISTITUTORIFERIMENTO",
    "CODICESCUOLA",
    "DENOMINAZIONESCUOLA",
    "INDIRIZZOSCUOLA",
    "CAPSCUOLA",
    "CODICECOMUNESCUOLA",
    "DESCRIZIONECOMUNE",
    "DESCRIZIONECARATTERISTICASCUOLA",
    "DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA",
    "INDICAZIONESEDEDIRETTIVO",
    "INDICAZIONESEDEOMNICOMPRENSIVO",
    "INDIRIZZOEMAILSCUOLA",
    "INDIRIZZOPECSCUOLA",
    "SITOWEBSCUOLA",
    "SEDESCOLASTICA",
)
REGISTRY_FIELDS_PARITARIA = (
    "ANNOSCOLASTICO",
    "AREAGEOGRAFICA",
    "REGIONE",
    "PROVINCIA",
    "CODICESCUOLA",
    "DENOMINAZIONESCUOLA",
    "INDIRIZZOSCUOLA",
    "CAPSCUOLA",
    "CODICECOMUNESCUOLA",
    "DESCRIZIONECOMUNE",
    "DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA",
    "INDIRIZZOEMAILSCUOLA",
    "INDIRIZZOPECSCUOLA",
    "SITOWEBSCUOLA",
)

SOURCE_FILES: dict[str, dict[str, dict[str, str]]] = {}
for period, _label in PERIODS:
    year = {"202223": "20222320230831", "202324": "20232420240831", "202425": "20242520250831"}[period]
    SOURCE_FILES[period] = {
        "state": {
            "students": f"https://dati.istruzione.it/opendata/opendata/catalogo/elements1/ALUSECGRADOINDSTA{year}.csv",
            "registry": f"https://dati.istruzione.it/opendata/opendata/catalogo/elements1/SCUANAGRAFESTAT{year}.csv",
        },
        "paritaria": {
            "students": f"https://dati.istruzione.it/opendata/opendata/catalogo/elements1/ALUSECGRADOINDPAR{year}.csv",
            "registry": f"https://dati.istruzione.it/opendata/opendata/catalogo/elements1/SCUANAGRAFEPAR{year}.csv",
        },
    }


def normalized_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = text.replace("‐", "-").replace("‑", "-").replace("‒", "-")
    text = text.replace("–", "-").replace("—", "-").replace("−", "-")
    text = text.replace("’", "'").replace("‘", "'")
    return " ".join(text.strip().split())


def normalized_region_label(value: str) -> str:
    return normalized_text(value).upper().replace(".", "")


def region_code(value: str) -> str:
    normalized = normalized_region_label(value)
    code = REGION_SOURCE_LABELS.get(normalized)
    if code is None:
        raise ValueError(f"Regione MIM non mappata: {value!r}")
    return code


def pathway_code(value: str) -> str:
    normalized = normalized_text(value)
    if normalized.casefold() == "iefp":
        return "IEFP"
    code = normalized.upper()
    if code not in PATHWAY_LABELS:
        raise ValueError(f"Percorso MIM inatteso: {value!r}")
    return code


def nonnegative_int(value: str, field: str, line_number: int) -> int:
    text = normalized_text(value)
    if not text.isdigit():
        raise ValueError(f"Valore {field} non valido alla riga CSV {line_number}: {value!r}")
    result = int(text)
    if result < 0:
        raise ValueError(f"Valore {field} negativo alla riga CSV {line_number}: {value!r}")
    return result


def read_csv_bytes(payload: bytes, expected_fields: tuple[str, ...], source_url: str) -> list[dict[str, str]]:
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError(f"CSV non UTF-8: {source_url}") from error
    reader = csv.DictReader(io.StringIO(text, newline=""))
    if tuple(reader.fieldnames or ()) != expected_fields:
        raise ValueError(
            f"Intestazione inattesa per {source_url}: {reader.fieldnames!r}; attesa {expected_fields!r}"
        )
    rows = []
    for row in reader:
        if not any(normalized_text(value or "") for value in row.values()):
            continue
        rows.append({field: value or "" for field, value in row.items()})
    return rows


def source_bytes(url: str, input_dir: Path | None, local_name: str) -> bytes:
    if input_dir is not None:
        path = input_dir / local_name
        if not path.is_file():
            raise FileNotFoundError(f"Input locale mancante: {path}")
        return path.read_bytes()
    request = urllib.request.Request(url, headers={"User-Agent": "DoveVannoINostriSoldi education atlas ETL"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    if not payload:
        raise ValueError(f"Fonte vuota: {url}")
    return payload


def file_receipt(
    *,
    period: str,
    school_type: str,
    role: str,
    url: str,
    payload: bytes,
    rows: int,
) -> dict[str, Any]:
    return {
        "period": period,
        "schoolType": school_type,
        "role": role,
        "url": url,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "rows": rows,
    }


def registry_map(rows: list[dict[str, str]], source_url: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for line_number, row in enumerate(rows, start=2):
        code = normalized_text(row["CODICESCUOLA"]).upper()
        if not code:
            raise ValueError(f"Codice scuola vuoto alla riga {line_number}: {source_url}")
        current_region = region_code(row["REGIONE"])
        previous_region = result.get(code)
        if previous_region is not None and previous_region != current_region:
            raise ValueError(f"Codice scuola associato a due Regioni alla riga {line_number}: {code}")
        result[code] = current_region
    return result


def add_bucket(bucket: dict[str, int], male: int, female: int) -> None:
    bucket["maleCount"] += male
    bucket["femaleCount"] += female
    bucket["studentCount"] += male + female


def aggregate_source(
    *,
    period: str,
    school_type: str,
    students: list[dict[str, str]],
    registry: dict[str, str],
    source_url: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    regional: dict[tuple[str, str], dict[str, Any]] = {}
    pathways: dict[tuple[str, str, str], dict[str, Any]] = {}
    addresses: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    school_codes_by_region: dict[str, set[str]] = defaultdict(set)
    seen_source_keys: set[tuple[str, str, str, str, str]] = set()

    for line_number, row in enumerate(students, start=2):
        code = normalized_text(row["CODICESCUOLA"]).upper()
        region = registry.get(code)
        if region is None:
            raise ValueError(f"Codice scuola degli studenti non presente nell'anagrafe alla riga {line_number}: {code}")
        course_year = normalized_text(row["ANNOCORSO"])
        pathway = pathway_code(row["PERCORSO"])
        address = normalized_text(row["INDIRIZZO"])
        if not course_year.isdigit() or not address:
            raise ValueError(f"Dimensione obbligatoria non valida alla riga {line_number}: {source_url}")
        source_key = (code, course_year, pathway, address, normalized_text(row["TIPOPERCORSO"]))
        if source_key in seen_source_keys:
            raise ValueError(f"Riga studenti duplicata alla riga {line_number}: {source_key}")
        seen_source_keys.add(source_key)

        male = nonnegative_int(row["ALUNNIMASCHI"], "ALUNNIMASCHI", line_number)
        female = nonnegative_int(row["ALUNNIFEMMINE"], "ALUNNIFEMMINE", line_number)
        school_codes_by_region[region].add(code)

        regional_bucket = regional.setdefault(
            (region, school_type),
            {"studentCount": 0, "maleCount": 0, "femaleCount": 0},
        )
        add_bucket(regional_bucket, male, female)

        pathway_bucket = pathways.setdefault(
            (region, school_type, pathway),
            {"studentCount": 0, "maleCount": 0, "femaleCount": 0},
        )
        add_bucket(pathway_bucket, male, female)

        address_bucket = addresses.setdefault(
            (region, school_type, pathway, address),
            {"studentCount": 0, "maleCount": 0, "femaleCount": 0},
        )
        add_bucket(address_bucket, male, female)

    regional_rows = []
    for (region, current_type), values in regional.items():
        regional_rows.append(
            {
                "period": period,
                "schoolType": current_type,
                "regionCode": region,
                "regionName": REGION_NAMES[region],
                **values,
                "schoolCount": len(school_codes_by_region[region]),
            }
        )

    pathway_rows = []
    for (region, current_type, pathway), values in pathways.items():
        pathway_rows.append(
            {
                "period": period,
                "schoolType": current_type,
                "regionCode": region,
                "regionName": REGION_NAMES[region],
                "pathwayCode": pathway,
                "pathwayLabel": PATHWAY_LABELS[pathway],
                **values,
            }
        )

    address_rows = []
    for (region, current_type, pathway, address), values in addresses.items():
        address_rows.append(
            {
                "period": period,
                "schoolType": current_type,
                "regionCode": region,
                "regionName": REGION_NAMES[region],
                "pathwayCode": pathway,
                "pathwayLabel": PATHWAY_LABELS[pathway],
                "addressLabel": address,
                **values,
            }
        )

    total = sum(row["studentCount"] for row in regional_rows)
    male_total = sum(row["maleCount"] for row in regional_rows)
    female_total = sum(row["femaleCount"] for row in regional_rows)
    coverage = {
        "sourceRows": len(students),
        "matchedRows": len(students),
        "unmatchedRows": 0,
        "schoolCount": len({code for codes in school_codes_by_region.values() for code in codes}),
        "regionCount": len(school_codes_by_region),
        "studentCount": total,
        "maleCount": male_total,
        "femaleCount": female_total,
        "addressCount": len(addresses),
    }
    return regional_rows, pathway_rows, address_rows, coverage


def sorted_regions() -> list[dict[str, str]]:
    return [{"code": code, "name": REGION_NAMES[code]} for code in REGION_CODES]


def build_snapshot(observed_at: str, input_dir: Path | None = None) -> dict[str, Any]:
    all_regional: list[dict[str, Any]] = []
    all_pathways: list[dict[str, Any]] = []
    all_addresses: list[dict[str, Any]] = []
    coverage_by_period_type: dict[str, dict[str, Any]] = {}
    source_files: list[dict[str, Any]] = []

    for period, _period_label in PERIODS:
        coverage_by_period_type[period] = {}
        for school_type, _school_type_label in SCHOOL_TYPES:
            urls = SOURCE_FILES[period][school_type]
            students_name = f"students-{school_type}-{period}.csv"
            registry_name = f"registry-{school_type}-{period}.csv"
            students_payload = source_bytes(urls["students"], input_dir, students_name)
            registry_payload = source_bytes(urls["registry"], input_dir, registry_name)
            students = read_csv_bytes(students_payload, STUDENT_FIELDS, urls["students"])
            registry_fields = REGISTRY_FIELDS_STATE if school_type == "state" else REGISTRY_FIELDS_PARITARIA
            registry_rows = read_csv_bytes(registry_payload, registry_fields, urls["registry"])
            registry = registry_map(registry_rows, urls["registry"])
            regional, pathways, addresses, coverage = aggregate_source(
                period=period,
                school_type=school_type,
                students=students,
                registry=registry,
                source_url=urls["students"],
            )
            all_regional.extend(regional)
            all_pathways.extend(pathways)
            all_addresses.extend(addresses)
            coverage_by_period_type[period][school_type] = coverage
            source_files.append(file_receipt(
                period=period,
                school_type=school_type,
                role="students",
                url=urls["students"],
                payload=students_payload,
                rows=len(students),
            ))
            source_files.append(file_receipt(
                period=period,
                school_type=school_type,
                role="registry",
                url=urls["registry"],
                payload=registry_payload,
                rows=len(registry_rows),
            ))

    observed_regions = sorted({row["regionCode"] for row in all_regional})
    missing_regions = [code for code in REGION_CODES if code not in observed_regions]
    pathways = sorted(
        ({"code": code, "label": label} for code, label in PATHWAY_LABELS.items()),
        key=lambda item: item["label"].casefold(),
    )

    return {
        "schemaVersion": 1,
        "generatedAt": observed_at,
        "observationType": "aggregate",
        "geographyLevel": "region",
        "periods": [{"id": period, "label": label} for period, label in PERIODS],
        "regions": sorted_regions(),
        "schoolTypes": [{"code": code, "label": label} for code, label in SCHOOL_TYPES],
        "pathways": pathways,
        "sources": [
            {
                "id": "students",
                "label": "Studenti della scuola secondaria di II grado per percorso e indirizzo",
                "url": "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/ALUSECGRADOINDSTA20242520250831.csv",
                "landingUrl": "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Studenti",
                "publisher": "Ministero dell'Istruzione e del Merito",
                "license": "IODL 2.0",
                "updatedAt": "2026-02-23",
                "observedAt": observed_at,
                "cadence": "annuale",
                "coverage": "Scuola secondaria di II grado; anno scolastico, tipo percorso, percorso, indirizzo e genere; statali e paritarie per il triennio 2022/23-2024/25.",
                "caveat": "Il numero di studenti descrive la presenza nel file MIM e non misura qualità, esiti, domanda futura o disponibilità di lavoro.",
            },
            {
                "id": "registry",
                "label": "Anagrafe delle scuole",
                "url": "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/SCUANAGRAFESTAT20242520250831.csv",
                "landingUrl": "https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Scuole",
                "publisher": "Ministero dell'Istruzione e del Merito",
                "license": "IODL 2.0",
                "updatedAt": "2026-06-18",
                "observedAt": observed_at,
                "cadence": "annuale",
                "coverage": "Anagrafe delle sedi scolastiche usata per collegare i codici scuola ai territori senza pubblicare il dettaglio nominativo nel prodotto.",
                "caveat": "Il join territoriale è tecnico: non rende comparabili automaticamente qualità, dotazioni o risultati delle scuole.",
            },
        ],
        "sourceFiles": source_files,
        "regionalObservations": sorted(
            all_regional,
            key=lambda row: (row["period"], row["schoolType"], row["regionCode"]),
        ),
        "pathwayObservations": sorted(
            all_pathways,
            key=lambda row: (row["period"], row["schoolType"], row["regionCode"], row["pathwayLabel"]),
        ),
        "addressObservations": sorted(
            all_addresses,
            key=lambda row: (
                row["period"],
                row["schoolType"],
                row["regionCode"],
                row["pathwayLabel"],
                row["addressLabel"],
            ),
        ),
        "coverage": {
            "expectedRegionCount": len(REGION_CODES),
            "observedRegionCount": len(observed_regions),
            "missingRegionCodes": missing_regions,
            "byPeriodSchoolType": coverage_by_period_type,
            "joinKey": "CODICESCUOLA",
            "sourceGrain": "CODICESCUOLA × ANNOCORSO × TIPOPERCORSO × PERCORSO × INDIRIZZO",
        },
    }


def assert_snapshot(snapshot: dict[str, Any]) -> None:
    if snapshot.get("schemaVersion") != 1:
        raise ValueError("schemaVersion inattesa")
    if snapshot.get("observationType") != "aggregate" or snapshot.get("geographyLevel") != "region":
        raise ValueError("Il prodotto deve essere aggregate/region")
    if [item["id"] for item in snapshot.get("periods", [])] != [period for period, _label in PERIODS]:
        raise ValueError("Periodi scolastici inattesi")
    if [item["code"] for item in snapshot.get("regions", [])] != list(REGION_CODES):
        raise ValueError("Catalogo regioni inatteso")
    if [item["code"] for item in snapshot.get("schoolTypes", [])] != [code for code, _label in SCHOOL_TYPES]:
        raise ValueError("Tipi scuola inattesi")
    if len(snapshot.get("sources", [])) != 2:
        raise ValueError("Fonti MIM inattese")
    if len(snapshot.get("sourceFiles", [])) != 12:
        raise ValueError("Ricevute source file inattese")

    region_keys: set[tuple[str, str, str]] = set()
    for row in snapshot.get("regionalObservations", []):
        key = (row["period"], row["schoolType"], row["regionCode"])
        if key in region_keys:
            raise ValueError(f"Osservazione regionale duplicata: {key}")
        region_keys.add(key)
        if row["regionName"] != REGION_NAMES[row["regionCode"]]:
            raise ValueError(f"Nome Regione incoerente: {key}")
        for field in ("studentCount", "maleCount", "femaleCount", "schoolCount"):
            if not isinstance(row[field], int) or row[field] < 0:
                raise ValueError(f"Valore regionale non valido: {key}/{field}")

    pathway_keys: set[tuple[str, str, str, str]] = set()
    for row in snapshot.get("pathwayObservations", []):
        key = (row["period"], row["schoolType"], row["regionCode"], row["pathwayCode"])
        if key in pathway_keys:
            raise ValueError(f"Osservazione percorso duplicata: {key}")
        pathway_keys.add(key)
        if row["studentCount"] != row["maleCount"] + row["femaleCount"]:
            raise ValueError(f"Totale percorso non riconciliato: {key}")

    address_keys: set[tuple[str, str, str, str, str]] = set()
    for row in snapshot.get("addressObservations", []):
        key = (row["period"], row["schoolType"], row["regionCode"], row["pathwayCode"], row["addressLabel"])
        if key in address_keys:
            raise ValueError(f"Osservazione indirizzo duplicata: {key}")
        address_keys.add(key)
        if row["studentCount"] != row["maleCount"] + row["femaleCount"]:
            raise ValueError(f"Totale indirizzo non riconciliato: {key}")

    expected_coverage = snapshot["coverage"]["byPeriodSchoolType"]
    for period, _period_label in PERIODS:
        for school_type, _school_type_label in SCHOOL_TYPES:
            coverage = expected_coverage[period][school_type]
            regional_rows = [
                row for row in snapshot["regionalObservations"]
                if row["period"] == period and row["schoolType"] == school_type
            ]
            pathway_rows = [
                row for row in snapshot["pathwayObservations"]
                if row["period"] == period and row["schoolType"] == school_type
            ]
            address_rows = [
                row for row in snapshot["addressObservations"]
                if row["period"] == period and row["schoolType"] == school_type
            ]
            if sum(row["studentCount"] for row in regional_rows) != coverage["studentCount"]:
                raise ValueError(f"Totale regionale non riconciliato: {period}/{school_type}")
            if sum(row["studentCount"] for row in pathway_rows) != coverage["studentCount"]:
                raise ValueError(f"Totale percorso non riconciliato: {period}/{school_type}")
            if sum(row["studentCount"] for row in address_rows) != coverage["studentCount"]:
                raise ValueError(f"Totale indirizzo non riconciliato: {period}/{school_type}")
            if coverage["matchedRows"] != coverage["sourceRows"] or coverage["unmatchedRows"] != 0:
                raise ValueError(f"Join incompleto: {period}/{school_type}")

    missing = snapshot["coverage"]["missingRegionCodes"]
    if missing != ["02", "04"]:
        raise ValueError(f"Copertura regionale cambiata: {missing}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--input-dir", type=Path, help="Directory con i 12 CSV già scaricati.")
    parser.add_argument("--observed-at", default=OBSERVED_AT_DEFAULT)
    parser.add_argument("--check", action="store_true", help="Valida lo snapshot già committato senza rete.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.check:
            snapshot = json.loads(args.output.read_text(encoding="utf-8"))
            assert_snapshot(snapshot)
            print(f"OK education atlas snapshot: {args.output}")
            return 0
        snapshot = build_snapshot(args.observed_at, args.input_dir)
        assert_snapshot(snapshot)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(
            f"Generated {args.output}: {len(snapshot['regionalObservations'])} regional, "
            f"{len(snapshot['pathwayObservations'])} pathway, "
            f"{len(snapshot['addressObservations'])} address observations",
        )
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"education atlas ETL failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
