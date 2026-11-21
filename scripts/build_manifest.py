#!/usr/bin/env python3
"""Recursively scan ./questions for question files and write manifests/questions-manifest.json.

Static hosting cannot list folders, so the browser reads this manifest instead.
Uses only the Python standard library (3.8+).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_DIR = ROOT / "questions"
OUT = ROOT / "manifests" / "questions-manifest.json"


def main() -> int:
    files = []
    for path in sorted(QUESTIONS_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() != ".json":
            continue
        rel = path.relative_to(ROOT).as_posix()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as err:
            print(f"skip (invalid JSON): {rel} - {err}", file=sys.stderr)
            continue
        if isinstance(data, dict) and "meta" in data and isinstance(data.get("questions"), list):
            files.append(rel)
        else:
            print(f"skip (not a question file): {rel}", file=sys.stderr)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"files": files}, indent=2) + "\n", encoding="utf-8")
    print(f"Indexed {len(files)} test file(s) -> {OUT.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
