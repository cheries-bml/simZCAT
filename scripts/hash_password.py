#!/usr/bin/env python3
"""Print the passwordHash to put in data/users.json.

Usage: python3 scripts/hash_password.py <username>

hash = SHA-256 of "<passwordSalt>:<username in lowercase>:<password>" (same as the app).
Hashing is one-way; a hash cannot be turned back into the password.
"""
import getpass
import hashlib
import json
import sys
from pathlib import Path

CONFIG = Path(__file__).resolve().parent.parent / "data" / "config.json"


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].strip():
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 1
    salt = json.loads(CONFIG.read_text(encoding="utf-8"))["passwordSalt"]
    username = sys.argv[1].strip().lower()
    password = getpass.getpass("Password: ")
    print(hashlib.sha256(f"{salt}:{username}:{password}".encode("utf-8")).hexdigest())
    return 0


if __name__ == "__main__":
    sys.exit(main())
