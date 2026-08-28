import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PRIVATE_ADVISORY =
  "https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi/security/advisories/new";
const SECURITY_POLICY =
  "https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi/security/policy";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

function linesOf(content) {
  return content.split("\n");
}

function securityTxtField(content, name) {
  const prefix = `${name}: `;
  const line = linesOf(content).find((entry) => entry.startsWith(prefix));
  assert.ok(line, `security.txt missing ${name}`);
  return line.slice(prefix.length);
}

test("unpatched vulnerabilities are routed to the private GitHub advisory form", async () => {
  const [securityMd, codeOfConduct, readme, contributing, securityTxt, supporto] = await Promise.all([
    source("../SECURITY.md"),
    source("../CODE_OF_CONDUCT.md"),
    source("../README.md"),
    source("../CONTRIBUTING.md"),
    source("../public/.well-known/security.txt"),
    source("../src/app/supporto/page.tsx"),
  ]);

  assert.equal(
    linesOf(securityMd).find((line) => line === PRIVATE_ADVISORY),
    PRIVATE_ADVISORY,
  );
  assert.equal(
    linesOf(codeOfConduct).find((line) => line === PRIVATE_ADVISORY),
    PRIVATE_ADVISORY,
  );

  assert.match(securityMd, /Non aprire una issue pubblica per vulnerabilità non ancora corrette/);
  assert.doesNotMatch(securityMd, /Se la funzione non è disponibile/);
  assert.doesNotMatch(securityMd, /contatta privatamente un maintainer/);

  assert.match(codeOfConduct, /Per una vulnerabilità non ancora corretta non aprire una issue/);
  assert.match(codeOfConduct, /\[SECURITY\.md\]\(SECURITY\.md\)/);

  assert.match(readme, /\[codice di condotta\]\(CODE_OF_CONDUCT\.md\)/);
  assert.match(readme, /\[canale privato\]\(SECURITY\.md\)/);
  assert.match(readme, /Per una vulnerabilità non ancora corretta non aprire una issue/);

  assert.match(contributing, /Non aprire una issue pubblica per una vulnerabilità non ancora corretta/);
  assert.match(contributing, /\[SECURITY\.md\]\(SECURITY\.md\)/);
  assert.match(contributing, /\[CODE_OF_CONDUCT\.md\]\(CODE_OF_CONDUCT\.md\)/);

  assert.equal(securityTxtField(securityTxt, "Contact"), PRIVATE_ADVISORY);
  assert.equal(securityTxtField(securityTxt, "Policy"), SECURITY_POLICY);
  assert.equal(securityTxtField(securityTxt, "Expires"), "2027-08-24T00:00:00.000Z");

  assert.match(supporto, /\$\{REPO_URL\}\/security\/advisories\/new/);
  assert.match(supporto, /vulnerabilità non\s+ancora corretta/);
  assert.match(supporto, /diritti privacy/);
  assert.match(supporto, /\$\{REPO_URL\}\/issues/);
});
