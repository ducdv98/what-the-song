#!/usr/bin/env python3
"""Validate the Food JSONL seed before fetching Commons images."""
from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlparse

from ingest import KNOWN_TIERS

REGIONS = {"Bắc", "Trung", "Nam", "Tây Nguyên", "Toàn quốc"}
OPENVERSE_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
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
    # Mirrors cleanTitle + stripDiacritics + collapse in core/vietnamese.ts.
    value = BRACKETED.sub(" ", value)
    value = FEAT.sub(" ", value)
    value = re.sub(r"\s*[|–—]\s*", " ", value)
    value = NOISE.sub(" ", value)
    value = unicodedata.normalize("NFD", value).replace("đ", "d").replace("Đ", "D")
    value = "".join(ch for ch in value if not ("\u0300" <= ch <= "\u036f"))
    return " ".join(re.findall(r"[^\W_]+", value.lower(), flags=re.UNICODE))


def slug(value: str) -> str:
    return loose_key(value).replace(" ", "-")


def commons_title(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "commons.wikimedia.org" or parsed.query or parsed.fragment:
        raise ValueError("commons_url must be an HTTPS Wikimedia Commons File page")
    title = unquote(parsed.path.removeprefix("/wiki/"))
    if not parsed.path.startswith("/wiki/File:") or not title.startswith("File:") or len(title) <= 5:
        raise ValueError("commons_url must be an HTTPS Wikimedia Commons File page")
    return title


def validate_rows(rows: list[object]) -> list[dict]:
    errors: list[str] = []
    valid: list[dict] = []
    ids: dict[str, int] = {}
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
        dish_id = row.get("id", slug(name))
        if not isinstance(dish_id, str) or not ID_RE.fullmatch(dish_id):
            errors.append(f"line {line}: invalid id")
            continue
        if dish_id in ids:
            errors.append(f"line {line}: duplicate id {dish_id}")
        ids[dish_id] = line
        if row.get("tier") is not None and (not isinstance(row["tier"], str) or row["tier"] not in KNOWN_TIERS):
            errors.append(f"line {line}: invalid tier")
        if row.get("region") is not None and (not isinstance(row["region"], str) or row["region"] not in REGIONS):
            errors.append(f"line {line}: invalid region")
        url = row.get("commons_url")
        openverse_id = row.get("openverse_id")
        try:
            if (url is None) == (openverse_id is None):
                raise ValueError("needs exactly one of commons_url or openverse_id")
            if url is not None:
                if not isinstance(url, str):
                    raise ValueError("commons_url must be a string")
                commons_title(url)
            elif not isinstance(openverse_id, str) or not OPENVERSE_ID.fullmatch(openverse_id):
                raise ValueError("openverse_id must be an Openverse image UUID")
        except ValueError as exc:
            errors.append(f"line {line}: {exc}")
        point = row.get("focalPoint", row.get("focal_point"))
        if point is not None and (not isinstance(point, dict) or
                set(point) != {"x", "y"} or
                any(type(point[k]) not in (int, float) or not math.isfinite(point[k]) or
                    not 0 <= point[k] <= 1 for k in ("x", "y"))):
            errors.append(f"line {line}: invalid focal point")
        name_key = loose_key(name)
        if not name_key:
            errors.append(f"line {line}: invalid name")
        elif name_key in aliases and aliases[name_key] != line:
            errors.append(f"line {line}: name collides with another Dish Alias")
        names[name_key] = line
        row_aliases = row.get("aliases", [])
        if not isinstance(row_aliases, list) or any(not isinstance(a, str) or not a.strip() for a in row_aliases):
            errors.append(f"line {line}: invalid aliases")
            row_aliases = []
        for alias in row_aliases:
            key = loose_key(alias)
            if not key or (key in names and names[key] != line) or (key in aliases and aliases[key] != line):
                errors.append(f"line {line}: Alias collides with another Dish or is invalid: {alias}")
            aliases[key] = line
        valid.append({**row, "id": dish_id})
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
    print(f"validated {len(rows)} Food seeds")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
