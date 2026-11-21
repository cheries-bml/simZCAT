#!/usr/bin/env python3
"""Rebuild the manifests the app reads (static hosting cannot list folders):

  manifests/questions-manifest.json   every valid question file under ./questions (recursive)
  manifests/files-manifest.json       every file under ./files (recursive), with its size in bytes

Uses only the Python standard library (3.8+).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_DIR = ROOT / "questions"
FILES_DIR = ROOT / "files"
OUT_QUESTIONS = ROOT / "manifests" / "questions-manifest.json"
OUT_FILES = ROOT / "manifests" / "files-manifest.json"


def write(path: Path, entries: list, label: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"files": entries}, indent=2) + "\n", encoding="utf-8")
    print(f"Indexed {len(entries)} {label} -> {path.relative_to(ROOT).as_posix()}")


def build_questions() -> None:
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
    write(OUT_QUESTIONS, files, "test file(s)")


def build_files() -> None:
    entries = []
    if FILES_DIR.is_dir():
        for path in sorted(FILES_DIR.rglob("*")):
            parts = path.relative_to(FILES_DIR).parts
            if not path.is_file() or any(p.startswith(".") for p in parts):  # skip dotfiles such as .gitkeep
                continue
            entries.append({"path": path.relative_to(ROOT).as_posix(), "size": path.stat().st_size})
    write(OUT_FILES, entries, "teaching file(s)")


def main() -> int:
    build_questions()
    build_files()
    return 0


if __name__ == "__main__":
    sys.exit(main())
