import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("SIOPE ETL ranks a low-volume municipality first per capita", async () => {
  const fixture = [
    { name: "Grande", region: "A", codiceFiscale: "1", population: 1_000_000, value: 1_000_000, perCapita: 1 },
    { name: "Piccolo", region: "B", codiceFiscale: "2", population: 10, value: 1_000, perCapita: 100 },
    { name: "Senza popolazione", region: "C", codiceFiscale: "3", population: null, value: 2_000_000, perCapita: null },
  ];
  const code = [
    "import json",
    "from scripts.etl.siope_municipal_snapshot import municipality_rankings, parse_population",
    `items = json.loads(${JSON.stringify(JSON.stringify(fixture))})`,
    "by_value, by_per_capita = municipality_rankings(items, 3)",
    "print(json.dumps({'value': [x['name'] for x in by_value], 'perCapita': [x['name'] for x in by_per_capita], 'sentinel': parse_population('00000001'), 'valid': parse_population('00000125')}))",
  ].join("\n");
  const { stdout } = await execFileAsync("python3", ["-c", code], {
    cwd: new URL("..", import.meta.url),
  });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.value, ["Senza popolazione", "Grande", "Piccolo"]);
  assert.deepEqual(result.perCapita, ["Piccolo", "Grande"]);
  assert.equal(result.sentinel, null);
  assert.equal(result.valid, 125);
});

test("SIOPE ETL resolves official provinces and rejects unknown province codes", async () => {
  const code = [
    "import json, tempfile, zipfile",
    "from pathlib import Path",
    "from scripts.etl.siope_municipal_snapshot import load_municipalities",
    "with tempfile.TemporaryDirectory() as directory:",
    "    archive = Path(directory) / 'registry.zip'",
    "    with zipfile.ZipFile(archive, 'w') as target:",
    "        target.writestr('ANAG_REG_PROV.csv', 'ITALIA NORD-OCCIDENTALE,01,PIEMONTE,004,Cuneo\\n')",
    "        target.writestr('ANAG_ENTI_SIOPE.csv', '1,2020-01-01,9999-12-31,CF1,COMUNE DI TEST,001,004,100,COMUNE\\n')",
    "    active, _, count = load_municipalities(archive, {'CF1': 'Piemonte'})",
    "    province = active['1']['province']",
    "    with zipfile.ZipFile(archive, 'w') as target:",
    "        target.writestr('ANAG_REG_PROV.csv', 'ITALIA NORD-OCCIDENTALE,01,PIEMONTE,004,Cuneo\\n')",
    "        target.writestr('ANAG_ENTI_SIOPE.csv', '1,2020-01-01,9999-12-31,CF1,COMUNE DI TEST,001,999,100,COMUNE\\n')",
    "    try:",
    "        load_municipalities(archive, {'CF1': 'Piemonte'})",
    "    except RuntimeError as error:",
    "        rejected = 'Provincia SIOPE sconosciuta' in str(error)",
    "    else:",
    "        rejected = False",
    "    print(json.dumps({'province': province, 'count': count, 'rejected': rejected}))",
  ].join("\n");
  const { stdout } = await execFileAsync("python3", ["-c", code], {
    cwd: new URL("..", import.meta.url),
  });
  const result = JSON.parse(stdout);

  assert.deepEqual(result, { province: "Cuneo", count: 1, rejected: true });
});

test("SIOPE ETL builds resident-weighted distribution from the full municipal input", async () => {
  const rows = [
    { region: "Nord", population: 100, totalCents: 200_000, titleCents: 100_000 },
    { region: "Nord", population: 300, totalCents: 1_200_000, titleCents: 600_000 },
    { region: "Sud", population: 600, totalCents: 3_600_000, titleCents: 1_800_000 },
    { region: "Sud", population: 1_000, totalCents: 8_000_000, titleCents: 4_000_000 },
    { region: "Sud", population: null, totalCents: 2_000_000, titleCents: 1_000_000 },
  ];
  const code = [
    "import json",
    "from scripts.etl.siope_municipal_snapshot import build_distribution",
    `rows = json.loads(${JSON.stringify(JSON.stringify(rows))})`,
    "validators = {k: {'lastModified': 'now', 'sha256': 'a' * 64} for k in ('movements', 'registry', 'ipa')}",
    "result = build_distribution(rows=rows, year=2026, latest_month=8, observed_at='2026-08-21T00:00:00+00:00', validators=validators)",
    "print(json.dumps(result))",
  ].join("\n");
  const { stdout } = await execFileAsync("python3", ["-c", code], {
    cwd: new URL("..", import.meta.url),
  });
  const result = JSON.parse(stdout);

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.period.completeness, "partial");
  assert.equal(result.coverage.municipalitiesWithMovements, 5);
  assert.equal(result.coverage.municipalitiesWithValidPopulation, 4);
  assert.equal(result.coverage.populationCovered, 2_000);
  assert.equal(result.nationalShareAll, 0.5);
  assert.equal(result.nationalShareCovered, 0.5);
  assert.deepEqual(result.perCapita.municipalityWeighted, {
    p10: 10,
    p25: 10,
    p50: 20,
    p75: 30,
    p90: 40,
  });
  assert.deepEqual(result.perCapita.residentWeighted, {
    p10: 20,
    p25: 30,
    p50: 30,
    p75: 40,
    p90: 40,
  });
  assert.equal(result.populationBands[0].municipalities, 3);
  assert.equal(result.populationBands[1].municipalities, 1);
  assert.deepEqual(result.regions.map((item) => item.region), ["Nord", "Sud"]);
  assert.equal(result.provenance.siopeMovementsSha256, "a".repeat(64));
});

test("SIOPE distribution does not fabricate a share for a zero denominator", async () => {
  const code = [
    "import json",
    "from scripts.etl.siope_municipal_snapshot import build_distribution",
    "rows = [{'region': 'Nord', 'population': 100, 'totalCents': 0, 'titleCents': 0}]",
    "validators = {k: {'lastModified': None, 'sha256': 'b' * 64} for k in ('movements', 'registry', 'ipa')}",
    "result = build_distribution(rows=rows, year=2025, latest_month=12, observed_at='2026-08-21T00:00:00+00:00', validators=validators)",
    "print(json.dumps(result))",
  ].join("\n");
  const { stdout } = await execFileAsync("python3", ["-c", code], {
    cwd: new URL("..", import.meta.url),
  });
  const result = JSON.parse(stdout);

  assert.equal(result.nationalShareAll, null);
  assert.equal(result.nationalShareCovered, null);
  assert.equal(result.populationBands[0].share, null);
  assert.equal(result.period.completeness, "complete");
});

test("SIOPE distribution rejects fake provenance and inconsistent title components", async () => {
  const code = [
    "import json",
    "from scripts.etl.siope_municipal_snapshot import build_distribution",
    "rows = [{'region': 'Nord', 'population': 100, 'totalCents': 100, 'titleCents': 101}]",
    "bad_hash = {k: {'lastModified': None, 'sha256': 'hash'} for k in ('movements', 'registry', 'ipa')}",
    "good_hash = {k: {'lastModified': None, 'sha256': 'c' * 64} for k in ('movements', 'registry', 'ipa')}",
    "errors = []",
    "for validators in (bad_hash, good_hash):",
    "    try:",
    "        build_distribution(rows=rows, year=2026, latest_month=8, observed_at='2026-08-21T00:00:00+00:00', validators=validators)",
    "    except RuntimeError as error:",
    "        errors.append(str(error))",
    "print(json.dumps(errors))",
  ].join("\n");
  const { stdout } = await execFileAsync("python3", ["-c", code], {
    cwd: new URL("..", import.meta.url),
  });
  const errors = JSON.parse(stdout);
  assert.match(errors[0], /SHA-256 .*non valido/);
  assert.match(errors[1], /Titolo 1 supera il totale/);
});
