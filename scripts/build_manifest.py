#!/usr/bin/env python3
"""Rebuild the manifests the app reads (static hosting cannot list folders):

  manifests/questions-manifest.json   every valid question file under ./questions (recursive), newest first
  manifests/files-manifest.json       every file under ./files (recursive), with its size in bytes

Uses only the Python standard library (3.8+).
"""
import json
import sys
from datetime import datetime
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


def created_at(data: dict):
    """meta.created (e.g. "2026-11-19") as a timestamp, or None."""
    try:
        return datetime.fromisoformat(str(data["meta"].get("created"))).timestamp()
    except (KeyError, TypeError, ValueError, AttributeError):
        return None


def build_questions() -> None:
    found = []  # (timestamp or None, path)
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
            found.append((created_at(data), rel))
        else:
            print(f"skip (not a question file): {rel}", file=sys.stderr)
    # Newest first (by meta.created, undated files last): the app treats the first entries as the newest tests.
    found.sort(key=lambda item: (item[0] is None, -(item[0] or 0), item[1]))
    write(OUT_QUESTIONS, [rel for _, rel in found], "test file(s)")


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
