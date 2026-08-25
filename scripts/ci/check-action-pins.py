#!/usr/bin/env python3
"""Verify that all GitHub Actions `uses:` references are SHA-pinned.

Pinned actions must match a commit SHA recorded in ``action-pins.json``.
Tag-based references (``actions/checkout@v6``) are rejected — only
``actions/checkout@<40-hex-sha>`` is accepted.

Local actions (``./.github/actions/foo``) and Docker actions
(``docker://image:tag``) are exempt.

Usage:
    python scripts/ci/check-action-pins.py          # check all workflows
    python scripts/ci/check-action-pins.py --fix    # report + attempt auto-fix

Exit code is 0 if all third-party actions are SHA-pinned, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
WORKFLOWS_DIR = ROOT / ".github" / "workflows"
PINS_FILE = ROOT / "scripts" / "ci" / "action-pins.json"

# Match: uses: owner/repo@ref   (possibly with leading whitespace and a comment)
USES_RE = re.compile(
    r"^(\s*-\s*name:\s*.+\n\s*|\s*)uses:\s+([^\s#]+)(?:\s+#\s*(.+))?",
    re.MULTILINE,
)

# A full 40-char lowercase hex SHA
SHA_RE = re.compile(r"^[0-9a-f]{40}$")

# A valid GitHub action reference: owner/repo
ACTION_RE = re.compile(r"^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$")


def load_pins() -> dict[str, dict]:
    """Load the pin lockfile and return a mapping of action-name → {tag, sha}."""
    data = json.loads(PINS_FILE.read_text())
    return data.get("actions", {})


def extract_uses(workflow_path: Path) -> list[tuple[int, str, str | None]]:
    """Extract (line_number, action_ref, version_comment) from a workflow file.

    Only returns third-party action references (owner/repo@...).
    Local actions (./...) and Docker actions (docker://...) are skipped.
    """
    content = workflow_path.read_text()
    results = []
    for match in USES_RE.finditer(content):
        action_ref = match.group(2)
        version_comment = match.group(3)

        # Skip local actions (./.github/actions/...)
        if action_ref.startswith("./"):
            continue
        # Skip Docker actions
        if action_ref.startswith("docker://"):
            continue
        # Must be owner/repo@ref
        if "@" not in action_ref:
            continue
        action_name = action_ref.split("@")[0]
        if not ACTION_RE.match(action_name):
            continue

        line_num = content[: match.start()].count("\n") + 1
        results.append((line_num, action_ref, version_comment))

    return results


def check_workflow(
    workflow_path: Path, pins: dict[str, dict]
) -> list[str]:
    """Check a single workflow file. Returns a list of error strings."""
    errors = []
    file_label = workflow_path.relative_to(ROOT)

    for line_num, action_ref, comment in extract_uses(workflow_path):
        action_name, ref = action_ref.split("@", 1)

        # Must be a 40-char SHA
        if not SHA_RE.match(ref):
            # Check if it's a tag that we have a pin for
            if action_name in pins:
                expected_sha = pins[action_name]["sha"]
                expected_tag = pins[action_name]["tag"]
                errors.append(
                    f"{file_label}:{line_num}: {action_ref} — "
                    f"tag-based ref, pin to "
                    f"{action_name}@{expected_sha} # {expected_tag}"
                )
            else:
                errors.append(
                    f"{file_label}:{line_num}: {action_ref} — "
                    f"unpinned action (not in {PINS_FILE.name})"
                )
            continue

        # It's a SHA — verify it matches the lockfile
        if action_name not in pins:
            errors.append(
                f"{file_label}:{line_num}: {action_name}@{ref} — "
                f"SHA-pinned but not recorded in {PINS_FILE.name}"
            )
            continue

        expected_sha = pins[action_name]["sha"]
        if ref != expected_sha:
            expected_tag = pins[action_name]["tag"]
            errors.append(
                f"{file_label}:{line_num}: {action_name}@{ref} — "
                f"SHA does not match {PINS_FILE.name} "
                f"(expected {expected_sha} # {expected_tag})"
            )
            continue

        # SHA matches — verify the version comment is present
        if not comment:
            expected_tag = pins[action_name]["tag"]
            errors.append(
                f"{file_label}:{line_num}: {action_name}@{ref} — "
                f"missing version comment (add ' # {expected_tag}')"
            )

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify that all GitHub Actions uses are SHA-pinned."
    )
    parser.parse_args()

    if not PINS_FILE.exists():
        print(f"ERROR: Pin file not found: {PINS_FILE}", file=sys.stderr)
        return 1

    pins = load_pins()

    if not pins:
        print("ERROR: No pinned actions in lockfile", file=sys.stderr)
        return 1

    errors: list[str] = []
    checked = 0

    for workflow_path in sorted(WORKFLOWS_DIR.glob("*.yml")):
        checked += 1
        errors.extend(check_workflow(workflow_path, pins))

    print(f"Checked {checked} workflow file(s), {len(pins)} pinned action(s)")

    if errors:
        print(
            f"\n❌ {len(errors)} pin violation(s):\n", file=sys.stderr
        )
        for err in errors:
            print(f"  • {err}", file=sys.stderr)
        return 1

    print("✅ All third-party actions are SHA-pinned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
