#!/usr/bin/env python3
"""Validate a People JSONL seed before downloading photos."""
from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

from ingest import KNOWN_TIERS

FIELDS = {"Ca sĩ", "Diễn viên", "MC / Hài", "Streamer", "Influencer"}
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
BRACKETED = re.compile(r"[([{][^)\]}]*[)\]}]")
FEAT = re.compile(r"\s*\b(?:feat|ft|featuring|with)\b\.?\s.*$", re.IGNORECASE)
NOISE = re.compile(
    r"\s*\b(?:official\s+(?:mv|music\s+video|audio|video|lyrics?\s+video)|"
    r"music\s+video|lyrics?\s+video|lyrics?|mv|m/v|audio|video|visualizer|"
    r"karaoke|beat|instrumental|acoustic|remix|cover|live|demo|ost|"
    r"original\s+soundtrack|hd|hq|4k)\b\.?", re.IGNORECASE,
)


def loose_key(value: str) -> str:
    """Mirror core's looseKey for Person names and Aliases."""
    value = BRACKETED.sub(" ", value)
    value = FEAT.sub(" ", value)
    value = re.sub(r"\s*[|–—]\s*", " ", value)
    value = NOISE.sub(" ", value)
    value = unicodedata.normalize("NFD", value).replace("đ", "d").replace("Đ", "D")
    value = "".join(ch for ch in value if not ("\u0300" <= ch <= "\u036f"))
    return " ".join(re.findall(r"[^\W_]+", value.lower(), flags=re.UNICODE))


def http_url(value: object) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def valid_reveal(value: object) -> bool:
    if not isinstance(value, list) or len(value) != 5:
        return False
    if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 < v <= 1 for v in value):
        return False
    return value[-1] == 1 and all(value[i] > value[i - 1] for i in range(1, 5))


def validate_rows(rows: list[object]) -> list[dict]:
    errors: list[str] = []
    valid: list[dict] = []
    ids: set[str] = set()
    names: dict[str, int] = {}
    aliases: dict[str, int] = {}
    for index, raw in enumerate(rows):
        line = index + 1
        if not isinstance(raw, dict):
            errors.append(f"line {line}: expected an object")
            continue
        row = raw
        name = row.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"line {line}: missing name")
            continue
        person_id = row.get("id", loose_key(name).replace(" ", "-"))
        if not isinstance(person_id, str) or not ID_RE.fullmatch(person_id):
            errors.append(f"line {line}: invalid id")
            continue
        if person_id in ids:
            errors.append(f"line {line}: duplicate id {person_id}")
        ids.add(person_id)
        if row.get("tier") is not None and row["tier"] not in KNOWN_TIERS:
            errors.append(f"line {line}: invalid tier")
        if not isinstance(row.get("field"), str) or row["field"] not in FIELDS:
            errors.append(f"line {line}: invalid field")
        for key in ("photo_url", "source_url"):
            if not http_url(row.get(key)):
                errors.append(f"line {line}: missing or invalid {key}")
        fractions = row.get("revealFractions", row.get("reveal_fractions"))
        if fractions is not None and not valid_reveal(fractions):
            errors.append(f"line {line}: invalid reveal fractions")
        key = loose_key(name)
        if not key:
            errors.append(f"line {line}: invalid name")
        elif key in aliases and aliases[key] != line:
            errors.append(f"line {line}: name collides with another Person Alias")
        names[key] = line
        row_aliases = row.get("aliases", [])
        if not isinstance(row_aliases, list) or any(not isinstance(a, str) or not a.strip() for a in row_aliases):
            errors.append(f"line {line}: invalid aliases")
            row_aliases = []
        for alias in row_aliases:
            key = loose_key(alias)
            if not key or (key in names and names[key] != line) or (key in aliases and aliases[key] != line):
                errors.append(f"line {line}: Alias collides with another Person or is invalid: {alias}")
            aliases[key] = line
        valid.append({**row, "id": person_id})
    if errors:
        raise ValueError("\n".join(errors))
    return valid


def load_seed(path: Path) -> list[dict]:
    rows = []
    for line, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        raw = raw.strip()
        if not raw or raw.startswith("//"):
            continue
        try:
            rows.append(json.loads(raw))
        except json.JSONDecodeError as exc:
            raise ValueError(f"line {line}: invalid JSON: {exc.msg}") from exc
    return validate_rows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("seed", type=Path)
    args = parser.parse_args()
    try:
        rows = load_seed(args.seed)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"{exc}\n")
    print(f"validated {len(rows)} People seeds")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
