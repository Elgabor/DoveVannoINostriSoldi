#!/usr/bin/env python3
"""Build the fail-closed ItaliaDomani snapshot for PNRR childcare projects."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import tempfile
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

DEFAULT_SPEC = Path("scripts/etl/specs/pnrr-childcare.source.json")
DEFAULT_DATA = Path("src/data/generated/pnrr-childcare.data.json")
DEFAULT_META = Path("src/data/generated/pnrr-childcare.meta.json")
MAX_SAFE_INTEGER = 9_007_199_254_740_991
CUP_RE = re.compile(r"^[A-Z0-9]{15}$")
CIG_RE = re.compile(r"^[A-Z0-9]{10}$")


class StructuralError(RuntimeError):
    """The source or generated artifact no longer satisfies its contract."""


def compact_text(value: str | None) -> str | None:
    if value is None:
        return None
    result = " ".join(value.replace("\u00a0", " ").split())
    if result and set(result) == {"#"}:
        return None
    return result or None


def required_text(value: str | None, field: str) -> str:
    result = compact_text(value)
    if result is None:
        raise StructuralError(f"{field}: valore obbligatorio assente")
    return result


def normalized_code(value: str | None) -> str | None:
    text = compact_text(value)
    return text.upper() if text else None


def date_value(value: str | None, field: str) -> str | None:
    text = compact_text(value)
    if text is None:
        return None
    if text in {"00/01/1900", "01/01/1900"}:
        return None
    for pattern in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, pattern).date().isoformat()
        except ValueError:
            continue
    raise StructuralError(f"{field}: data non valida: {text!r}")


def money_cents(value: str | None, field: str) -> int | None:
    text = compact_text(value)
    if text is None:
        return None
    normalized = text.replace("€", "").replace(" ", "")
    if "," in normalized:
        normalized = normalized.replace(".", "").replace(",", ".")
    try:
        amount = Decimal(normalized)
    except InvalidOperation as error:
        raise StructuralError(f"{field}: importo non valido: {text!r}") from error
    if amount < 0:
        raise StructuralError(f"{field}: importo negativo inatteso")
    cents = int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if cents > MAX_SAFE_INTEGER:
        raise StructuralError(f"{field}: supera il limite sicuro JavaScript")
    return cents


def share_basis_points(value: str | None, field: str) -> int | None:
    text = compact_text(value)
    if text is None:
        return None
    normalized = text.replace("%", "").replace(".", "").replace(",", ".")
    try:
        result = int((Decimal(normalized) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except InvalidOperation as error:
        raise StructuralError(f"{field}: percentuale non valida") from error
    if result < 0 or result > 10_000:
        raise StructuralError(f"{field}: percentuale fuori intervallo")
    return result


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical_sha256(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_asset(path: Path, asset: dict, label: str) -> None:
    if not path.is_file():
        raise StructuralError(f"{label}: file sorgente assente: {path}")
    observed_bytes = path.stat().st_size
    observed_hash = sha256_file(path)
    if observed_bytes != asset["bytes"] or observed_hash != asset["sha256"]:
        raise StructuralError(
            f"{label}: source lock non corrisponde "
            f"(bytes={observed_bytes}, sha256={observed_hash})"
        )


def selected_rows(path: Path, submeasure: str, required_headers: set[str], label: str):
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream, delimiter=";")
        headers = set(reader.fieldnames or [])
        missing = sorted(required_headers - headers)
        if missing:
            raise StructuralError(f"{label}: colonne mancanti: {', '.join(missing)}")
        for row_number, row in enumerate(reader, start=2):
            if row.get("Codice Univoco Submisura") == submeasure:
                yield row_number, row


PROJECT_HEADERS = {
    "Codice Univoco Submisura", "CUP", "Codice Locale Progetto", "Titolo Progetto",
    "Sintesi Progetto", "Stato CUP", "Stato Avanzamento Progetto", "CUP Descrizione Natura",
    "CUP Descrizione Tipologia", "CUP Descrizione Settore", "CUP Descrizione Sottosettore",
    "CUP Descrizione Categoria", "Finanziamento PNRR", "Finanziamento Totale",
    "Finanziamento Totale Pubblico Netto", "Finanziamento - Stato", "Finanziamento Comune",
    "Finanziamento Regione", "Finanziamento Privato", "Finanziamento da Reperire",
    "Soggetto Attuatore", "Codice Fiscale Soggetto Attuatore", "Flag Progetti in Essere",
    "Data Inizio Progetto Prevista", "Data Inizio Progetto Effettiva", "Data Fine Progetto Prevista",
    "Data Fine Progetto Effettiva", "Data di Estrazione", "Data Ultima Validazione",
    "Esito Ultima Validazione", "Codice Fase Iter di Progetto", "Descrizione Fase Iter di Progetto",
    "Stato Fase Iter di Progetto",
}
LOCATION_HEADERS = {
    "Codice Univoco Submisura", "CUP", "Regione", "Descrizione Regione", "Provincia",
    "Descrizione Provincia", "Comune", "Descrizione Comune", "Indirizzo", "CAP",
    "Percentuale di Localizzazione", "Data di Estrazione",
}
TENDER_HEADERS = {
    "Codice Univoco Submisura", "CUP", "Codice Locale Progetto", "CIG", "CIG Accordo Quadro",
    "Codice Procedura Utente", "Codice Interno PDA", "Descrizione Procedura di Aggiudicazione",
    "Modalità di Realizzazione", "Oggetto Principale del Contratto", "Oggetto Gara",
    "Data Pubblicazione del CIG", "Descrizione Motivo Assenza CIG", "Importo Complessivo Gara",
    "Importo Aggiudicazione", "Data Aggiudicazione Definitiva", "Data di Estrazione",
}
AWARDEE_HEADERS = {
    "Codice Univoco Submisura", "CUP", "CIG", "Codice interno PDA", "Codice Fiscale/P.IVA",
    "Denominazione Aggiudicatario", "Descrizione Ruolo Soggetto",
    "Descrizione Forma Giuridica Aggiudicatario", "Codice ATECO Aggiudicatario",
    "Codice Procedura Utente", "Data di Estrazione",
}


def project_record(row: dict, row_number: int) -> dict:
    cup = required_text(row.get("CUP"), f"projects:{row_number}.CUP").upper()
    if not CUP_RE.fullmatch(cup):
        raise StructuralError(f"projects:{row_number}.CUP non valido: {cup}")
    money = lambda header: money_cents(row.get(header), f"projects:{row_number}.{header}")
    return {
        "cup": cup,
        "localProjectCode": compact_text(row.get("Codice Locale Progetto")),
        "title": required_text(row.get("Titolo Progetto"), f"projects:{row_number}.Titolo Progetto"),
        "summary": compact_text(row.get("Sintesi Progetto")),
        "classification": {
            "nature": compact_text(row.get("CUP Descrizione Natura")),
            "type": compact_text(row.get("CUP Descrizione Tipologia")),
            "sector": compact_text(row.get("CUP Descrizione Settore")),
            "subsector": compact_text(row.get("CUP Descrizione Sottosettore")),
            "category": compact_text(row.get("CUP Descrizione Categoria")),
        },
        "status": {
            "cup": compact_text(row.get("Stato CUP")),
            "progress": compact_text(row.get("Stato Avanzamento Progetto")),
            "phaseCode": compact_text(row.get("Codice Fase Iter di Progetto")),
            "phase": compact_text(row.get("Descrizione Fase Iter di Progetto")),
            "phaseStatus": compact_text(row.get("Stato Fase Iter di Progetto")),
            "validationOutcome": compact_text(row.get("Esito Ultima Validazione")),
            "validatedAt": date_value(row.get("Data Ultima Validazione"), f"projects:{row_number}.Data Ultima Validazione"),
        },
        "funding": {
            "pnrrCents": money("Finanziamento PNRR"),
            "totalCents": money("Finanziamento Totale"),
            "netPublicCents": money("Finanziamento Totale Pubblico Netto"),
            "stateCents": money("Finanziamento - Stato"),
            "municipalityCents": money("Finanziamento Comune"),
            "regionCents": money("Finanziamento Regione"),
            "privateCents": money("Finanziamento Privato"),
            "toBeFoundCents": money("Finanziamento da Reperire"),
        },
        "implementer": {
            "name": compact_text(row.get("Soggetto Attuatore")),
            "taxCode": normalized_code(row.get("Codice Fiscale Soggetto Attuatore")),
        },
        "timeline": {
            "plannedStart": date_value(row.get("Data Inizio Progetto Prevista"), f"projects:{row_number}.inizio previsto"),
            "actualStart": date_value(row.get("Data Inizio Progetto Effettiva"), f"projects:{row_number}.inizio effettivo"),
            "plannedEnd": date_value(row.get("Data Fine Progetto Prevista"), f"projects:{row_number}.fine prevista"),
            "actualEnd": date_value(row.get("Data Fine Progetto Effettiva"), f"projects:{row_number}.fine effettiva"),
        },
        "existingProject": compact_text(row.get("Flag Progetti in Essere")),
        "locations": [],
        "tenders": [],
        "awardees": [],
    }


def location_record(row: dict, row_number: int) -> dict:
    return {
        "regionCode": compact_text(row.get("Regione")),
        "region": required_text(row.get("Descrizione Regione"), f"locations:{row_number}.regione"),
        "provinceCode": compact_text(row.get("Provincia")),
        "province": compact_text(row.get("Descrizione Provincia")),
        "municipalityCode": compact_text(row.get("Comune")),
        "municipality": compact_text(row.get("Descrizione Comune")),
        "address": compact_text(row.get("Indirizzo")),
        "postalCode": compact_text(row.get("CAP")),
        "shareBasisPoints": share_basis_points(row.get("Percentuale di Localizzazione"), f"locations:{row_number}.percentuale"),
    }


def tender_record(row: dict, row_number: int) -> dict:
    cig = normalized_code(row.get("CIG"))
    if cig is not None and not CIG_RE.fullmatch(cig):
        raise StructuralError(f"tenders:{row_number}.CIG non valido: {cig}")
    return {
        "cig": cig,
        "frameworkCig": normalized_code(row.get("CIG Accordo Quadro")),
        "userProcedureCode": compact_text(row.get("Codice Procedura Utente")),
        "internalProcedureCode": compact_text(row.get("Codice Interno PDA")),
        "procedure": compact_text(row.get("Descrizione Procedura di Aggiudicazione")),
        "deliveryMode": compact_text(row.get("Modalità di Realizzazione")),
        "contractType": compact_text(row.get("Oggetto Principale del Contratto")),
        "subject": compact_text(row.get("Oggetto Gara")),
        "publishedAt": date_value(row.get("Data Pubblicazione del CIG"), f"tenders:{row_number}.pubblicazione"),
        "absenceReason": compact_text(row.get("Descrizione Motivo Assenza CIG")),
        "amountCents": money_cents(row.get("Importo Complessivo Gara"), f"tenders:{row_number}.importo"),
        "awardAmountCents": money_cents(row.get("Importo Aggiudicazione"), f"tenders:{row_number}.aggiudicazione"),
        "awardedAt": date_value(row.get("Data Aggiudicazione Definitiva"), f"tenders:{row_number}.data aggiudicazione"),
    }


def awardee_record(row: dict) -> dict:
    return {
        "cig": normalized_code(row.get("CIG")),
        "userProcedureCode": compact_text(row.get("Codice Procedura Utente")),
        "internalProcedureCode": compact_text(row.get("Codice interno PDA")),
        "taxId": normalized_code(row.get("Codice Fiscale/P.IVA")),
        "name": compact_text(row.get("Denominazione Aggiudicatario")),
        "role": compact_text(row.get("Descrizione Ruolo Soggetto")),
        "legalForm": compact_text(row.get("Descrizione Forma Giuridica Aggiudicatario")),
        "atecoCode": compact_text(row.get("Codice ATECO Aggiudicatario")),
    }


def join_key(record: dict) -> tuple[str | None, str | None, str | None]:
    return (record.get("cig"), record.get("internalProcedureCode"), record.get("userProcedureCode"))


def extraction_date(row: dict, label: str) -> str:
    value = date_value(row.get("Data di Estrazione"), f"{label}.Data di Estrazione")
    if value is None:
        raise StructuralError(f"{label}.Data di Estrazione assente")
    return value


def build_snapshot(spec: dict, paths: dict[str, Path], observed_at: str) -> tuple[dict, dict]:
    submeasure = spec["submeasure"]["code"]
    for label, path in paths.items():
        verify_asset(path, spec["source"]["assets"][label], label)

    projects: dict[str, dict] = {}
    extraction_dates: set[str] = set()
    counts = {"projectRows": 0, "locationRows": 0, "tenderRows": 0, "awardeeRows": 0}

    for row_number, row in selected_rows(paths["projects"], submeasure, PROJECT_HEADERS, "projects"):
        counts["projectRows"] += 1
        extraction_dates.add(extraction_date(row, f"projects:{row_number}"))
        project = project_record(row, row_number)
        if project["cup"] in projects:
            raise StructuralError(f"projects: CUP duplicato {project['cup']}")
        projects[project["cup"]] = project

    for row_number, row in selected_rows(paths["locations"], submeasure, LOCATION_HEADERS, "locations"):
        counts["locationRows"] += 1
        extraction_dates.add(extraction_date(row, f"locations:{row_number}"))
        cup = required_text(row.get("CUP"), f"locations:{row_number}.CUP").upper()
        if cup not in projects:
            raise StructuralError(f"locations:{row_number}: CUP senza progetto {cup}")
        projects[cup]["locations"].append(location_record(row, row_number))

    for row_number, row in selected_rows(paths["tenders"], submeasure, TENDER_HEADERS, "tenders"):
        counts["tenderRows"] += 1
        extraction_dates.add(extraction_date(row, f"tenders:{row_number}"))
        cup = required_text(row.get("CUP"), f"tenders:{row_number}.CUP").upper()
        if cup not in projects:
            raise StructuralError(f"tenders:{row_number}: CUP senza progetto {cup}")
        projects[cup]["tenders"].append(tender_record(row, row_number))

    unmatched_awardees = 0
    for row_number, row in selected_rows(paths["awardees"], submeasure, AWARDEE_HEADERS, "awardees"):
        counts["awardeeRows"] += 1
        extraction_dates.add(extraction_date(row, f"awardees:{row_number}"))
        cup = required_text(row.get("CUP"), f"awardees:{row_number}.CUP").upper()
        if cup not in projects:
            raise StructuralError(f"awardees:{row_number}: CUP senza progetto {cup}")
        awardee = awardee_record(row)
        projects[cup]["awardees"].append(awardee)
        tender_keys = {join_key(item) for item in projects[cup]["tenders"]}
        if join_key(awardee) not in tender_keys:
            unmatched_awardees += 1

    expected = spec["expected"]
    if extraction_dates != {expected["referenceDate"]}:
        raise StructuralError(f"date di estrazione inattese: {sorted(extraction_dates)}")

    project_list = sorted(projects.values(), key=lambda item: item["cup"])
    for project in project_list:
        project["locations"].sort(key=lambda item: (item["region"], item["province"] or "", item["municipality"] or "", item["address"] or ""))
        project["tenders"].sort(key=lambda item: (item["cig"] or "", item["internalProcedureCode"] or "", item["subject"] or ""))
        project["awardees"].sort(key=lambda item: (item["cig"] or "", item["internalProcedureCode"] or "", item["name"] or "", item["taxId"] or ""))

    coverage = {
        **counts,
        "uniqueProjects": len(project_list),
        "projectsWithLocations": sum(bool(item["locations"]) for item in project_list),
        "projectsWithTenders": sum(bool(item["tenders"]) for item in project_list),
        "projectsWithAwardees": sum(bool(item["awardees"]) for item in project_list),
        "municipalities": len({(location["regionCode"], location["provinceCode"], location["municipalityCode"]) for item in project_list for location in item["locations"]}),
        "unmatchedAwardeeRows": unmatched_awardees,
    }
    for key, expected_value in expected.items():
        if key == "referenceDate":
            continue
        if coverage.get(key) != expected_value:
            raise StructuralError(f"coverage.{key}: atteso {expected_value}, trovato {coverage.get(key)}")

    totals = {
        "pnrrFundingCents": sum(item["funding"]["pnrrCents"] or 0 for item in project_list),
        "totalFundingCents": sum(item["funding"]["totalCents"] or 0 for item in project_list),
        "tenderAmountCents": sum(tender["amountCents"] or 0 for item in project_list for tender in item["tenders"]),
        "awardAmountCents": sum(tender["awardAmountCents"] or 0 for item in project_list for tender in item["tenders"]),
    }
    data = {
        "schemaVersion": 1,
        "dataset": "pnrr_asili",
        "submeasure": spec["submeasure"],
        "referenceDate": expected["referenceDate"],
        "projects": project_list,
    }
    meta = {
        "schemaVersion": 1,
        "dataset": "pnrr_asili",
        "generatedAt": observed_at,
        "referenceDate": expected["referenceDate"],
        "submeasure": spec["submeasure"],
        "coverage": coverage,
        "totals": totals,
        "source": spec["source"],
        "methodology": {
            "join": "Progetti e localizzazioni per CUP; gare e aggiudicatari restano collegabili per CUP + CIG + Codice interno PDA + Codice procedura utente.",
            "fundingWarning": "Il finanziamento PNRR non è un pagamento osservato e l'importo di gara non è necessariamente spesa erogata.",
            "territorialWarning": "Un CUP può avere più localizzazioni; le righe territoriali non vanno sommate come progetti distinti.",
            "validationWarning": "L'esito di validazione proviene dalla fonte e va mostrato senza trasformarlo in un giudizio sul progetto.",
        },
        "integrity": {
            "algorithm": "sha256",
            "sourceLockSha256": canonical_sha256({key: value for key, value in spec.items() if key != "integrity"}),
            "dataArtifact": {},
        },
    }
    return data, meta


def encoded_json(value: object, pretty: bool) -> bytes:
    options = {"ensure_ascii": False, "sort_keys": True}
    if pretty:
        options["indent"] = 2
    else:
        options["separators"] = (",", ":")
    return (json.dumps(value, **options) + "\n").encode("utf-8")


def validate_artifacts(spec: dict, data_path: Path, meta_path: Path) -> tuple[dict, dict]:
    try:
        data_bytes = data_path.read_bytes()
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        data = json.loads(data_bytes)
    except (OSError, json.JSONDecodeError) as error:
        raise StructuralError(f"artefatti non leggibili: {error}") from error
    if data.get("schemaVersion") != 1 or data.get("dataset") != "pnrr_asili":
        raise StructuralError("data artifact: schema o dataset inatteso")
    if meta.get("schemaVersion") != 1 or meta.get("dataset") != "pnrr_asili":
        raise StructuralError("meta artifact: schema o dataset inatteso")
    if len(data.get("projects", [])) != spec["expected"]["uniqueProjects"]:
        raise StructuralError("data artifact: conteggio progetti inatteso")
    actual = {"bytes": len(data_bytes), "sha256": hashlib.sha256(data_bytes).hexdigest()}
    if meta.get("integrity", {}).get("dataArtifact") != actual:
        raise StructuralError("meta artifact: hash o dimensione del data artifact non corrisponde")
    expected_lock = canonical_sha256({key: value for key, value in spec.items() if key != "integrity"})
    if meta["integrity"].get("sourceLockSha256") != expected_lock:
        raise StructuralError("meta artifact: source lock non corrisponde")
    if actual["bytes"] > spec["artifactBudgetBytes"]:
        raise StructuralError("data artifact supera il budget dichiarato")
    if meta.get("coverage", {}).get("uniqueProjects") != len(data["projects"]):
        raise StructuralError("meta artifact: coverage non riconciliata")
    return data, meta


def stage_file(path: Path, payload: bytes) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    return temporary


def restore_file(path: Path, previous: bytes | None) -> None:
    if previous is None:
        path.unlink(missing_ok=True)
        return
    temporary = stage_file(path, previous)
    os.replace(temporary, path)


def write_artifacts_atomically(data_path: Path, meta_path: Path, data_payload: bytes, meta_payload: bytes) -> None:
    previous_data = data_path.read_bytes() if data_path.exists() else None
    previous_meta = meta_path.read_bytes() if meta_path.exists() else None
    staged_data: Path | None = None
    staged_meta: Path | None = None
    data_replaced = False
    meta_replaced = False
    try:
        staged_data = stage_file(data_path, data_payload)
        staged_meta = stage_file(meta_path, meta_payload)
        os.replace(staged_data, data_path)
        data_replaced = True
        os.replace(staged_meta, meta_path)
        meta_replaced = True
    except Exception:
        if data_replaced:
            restore_file(data_path, previous_data)
        if meta_replaced:
            restore_file(meta_path, previous_meta)
        raise
    finally:
        if staged_data is not None:
            staged_data.unlink(missing_ok=True)
        if staged_meta is not None:
            staged_meta.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC)
    parser.add_argument("--projects-input", type=Path)
    parser.add_argument("--locations-input", type=Path)
    parser.add_argument("--tenders-input", type=Path)
    parser.add_argument("--awardees-input", type=Path)
    parser.add_argument("--data-output", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--meta-output", type=Path, default=DEFAULT_META)
    parser.add_argument("--observed-at")
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    spec = json.loads(arguments.spec.read_text(encoding="utf-8"))

    if arguments.check:
        data, meta = validate_artifacts(spec, arguments.data_output, arguments.meta_output)
        print(json.dumps({"projects": len(data["projects"]), "bytes": meta["integrity"]["dataArtifact"]["bytes"], "sha256": meta["integrity"]["dataArtifact"]["sha256"]}, indent=2))
        return 0

    input_paths = {
        "projects": arguments.projects_input,
        "locations": arguments.locations_input,
        "tenders": arguments.tenders_input,
        "awardees": arguments.awardees_input,
    }
    missing = [key for key, value in input_paths.items() if value is None]
    if missing:
        raise StructuralError(f"input obbligatori assenti: {', '.join(missing)}")
    observed_at = arguments.observed_at or spec["observedAt"]
    if not isinstance(observed_at, str) or not observed_at.endswith("Z"):
        raise StructuralError("observed-at deve essere un timestamp UTC terminante in Z")
    data, meta = build_snapshot(spec, input_paths, observed_at)
    data_payload = encoded_json(data, pretty=False)
    meta["integrity"]["dataArtifact"] = {
        "bytes": len(data_payload),
        "sha256": hashlib.sha256(data_payload).hexdigest(),
    }
    if len(data_payload) > spec["artifactBudgetBytes"]:
        raise StructuralError(f"data artifact di {len(data_payload)} byte oltre il budget")
    write_artifacts_atomically(
        arguments.data_output,
        arguments.meta_output,
        data_payload,
        encoded_json(meta, pretty=True),
    )
    validate_artifacts(spec, arguments.data_output, arguments.meta_output)
    print(json.dumps({"coverage": meta["coverage"], "totals": meta["totals"], "integrity": meta["integrity"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (StructuralError, OSError, json.JSONDecodeError, KeyError) as error:
        print(f"errore strutturale PNRR asili: {error}", file=sys.stderr)
        raise SystemExit(2) from error
