#!/usr/bin/env python3
"""
Check seed.jsonl before ingesting it.

    python tools/validate_seed.py seed.jsonl

Built for the workflow in docs/CATALOGUE.md, where an agent appends songs in
batches towards a 1000-song library. At that scale nobody re-reads the file, so
mistakes have to be caught mechanically: a duplicate id silently overwrites
another song's clips, an unknown genre files the song under "Khác" with no
error, and a title carrying "(Official MV)" makes a round unwinnable because
the answer no longer matches what a player would type.

Exits 1 if anything is an error, 0 if only warnings. Warnings are judgement
calls worth a look; errors will actually break something.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Import the genre list from ingest rather than copying it: a third copy would
# be a third thing to drift. ingest.py does nothing at import time.
_spec = importlib.util.spec_from_file_location("ingest", ROOT / "tools" / "ingest.py")
_ingest = importlib.util.module_from_spec(_spec)
sys.modules.setdefault("ingest", _ingest)
_spec.loader.exec_module(_ingest)
KNOWN_GENRES: list[str] = _ingest.KNOWN_GENRES
KNOWN_TIERS: list[str] = _ingest.KNOWN_TIERS

ID_RE = re.compile(r"^[a-z0-9-]+$")
YOUTUBE_RE = re.compile(r"^https?://(www\.|m\.|music\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w-]{6,}")
ANCHORS = {"hook", "intro", "body"}

# Markers that belong to a video title, not a song title. Any of these in
# `title` means the answer will not match what a player types.
TITLE_NOISE = re.compile(
    r"\b(official|mv|m/v|audio|video|lyrics?|karaoke|beat|instrumental|"
    r"remix|cover|live|ost|4k|hd|hq|full)\b|feat\.?\s|ft\.?\s|[\[\]()]",
    re.IGNORECASE,
)

# Target spread from docs/CATALOGUE.md §5, for the coverage report.
TARGETS = {
    "nhac-tre": 220, "ballad": 110, "rap-viet": 90, "nhac-vang": 90,
    "bolero": 70, "indie": 60, "nhac-do": 50, "dan-ca": 40, "nhac-phim": 40,
    "nhac-trinh": 40, "tien-chien": 35, "hai-ngoai": 35, "rock-viet": 30,
    "dance-edm": 30, "rnb-soul": 25, "acoustic": 20, "cai-luong": 20,
    "thieu-nhi": 20, "co-truyen": 15, "khac": 0,
}


def fold(text: str) -> str:
    """Lowercase, strip diacritics and punctuation — for duplicate detection."""
    nfd = unicodedata.normalize("NFD", text).lower().replace("đ", "d")
    bare = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", bare).strip()


def has_diacritics(text: str) -> bool:
    nfd = unicodedata.normalize("NFD", text)
    return any(unicodedata.category(c) == "Mn" for c in nfd) or "đ" in text.lower()


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        # Songs per difficulty tier; None counts the untagged (they play as medium).
        self.tiers: Counter = Counter()

    def error(self, line: int, msg: str) -> None:
        self.errors.append(f"  line {line}: {msg}")

    def warn(self, line: int, msg: str) -> None:
        self.warnings.append(f"  line {line}: {msg}")


def validate(path: Path) -> tuple[Report, Counter]:
    rep = Report()
    genres: Counter = Counter()
    seen_ids: dict[str, int] = {}
    seen_songs: dict[str, int] = {}
    seen_urls: dict[str, int] = {}
    total = 0

    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("//"):
            continue

        try:
            row = json.loads(line)
        except json.JSONDecodeError as e:
            rep.error(n, f"not valid JSON ({e.msg})")
            continue
        if not isinstance(row, dict):
            rep.error(n, "expected a JSON object")
            continue

        total += 1

        # ── Required fields ────────────────────────────────────────────────
        for field in ("id", "title", "artist", "url"):
            v = row.get(field)
            if not isinstance(v, str) or not v.strip():
                rep.error(n, f"missing or empty {field!r}")

        song_id = row.get("id")
        title = row.get("title")
        artist = row.get("artist")
        url = row.get("url")

        # ── id: format and uniqueness. A collision overwrites clips. ───────
        if isinstance(song_id, str) and song_id:
            if not ID_RE.match(song_id):
                rep.error(n, f"id {song_id!r} must match [a-z0-9-]+")
            if song_id in seen_ids:
                rep.error(n, f"duplicate id {song_id!r} (also line {seen_ids[song_id]})")
            else:
                seen_ids[song_id] = n

        # ── title ──────────────────────────────────────────────────────────
        if isinstance(title, str) and title:
            if TITLE_NOISE.search(title):
                rep.error(n, f"title carries video/release markers: {title!r}")
            if title == title.upper() and any(c.isalpha() for c in title):
                rep.warn(n, f"title is ALL CAPS: {title!r}")
            if not has_diacritics(title) and re.fullmatch(r"[\x00-\x7F\s]+", title):
                # Plenty of real titles are English, so this is a warning.
                rep.warn(n, f"title has no diacritics — verify spelling: {title!r}")

        # ── Duplicate song (title + artist, diacritic-insensitive) ─────────
        if isinstance(title, str) and isinstance(artist, str) and title and artist:
            key = f"{fold(title)}|{fold(artist)}"
            if key in seen_songs:
                rep.error(n, f"duplicate song {title!r} by {artist!r} (also line {seen_songs[key]})")
            else:
                seen_songs[key] = n

        # ── url ────────────────────────────────────────────────────────────
        if isinstance(url, str) and url:
            if not YOUTUBE_RE.match(url):
                rep.error(n, f"url does not look like a YouTube link: {url!r}")
            if url in seen_urls:
                rep.error(n, f"duplicate url (also line {seen_urls[url]})")
            else:
                seen_urls[url] = n

        # ── genre ──────────────────────────────────────────────────────────
        genre = row.get("genre")
        if genre is None:
            rep.error(n, "missing 'genre' — every song needs exactly one")
        elif genre not in KNOWN_GENRES:
            rep.error(n, f"unknown genre {genre!r}. Known: {', '.join(KNOWN_GENRES)}")
        else:
            genres[genre] += 1

        # ── tier ───────────────────────────────────────────────────────────
        # Optional — an untagged song plays as medium — but a misspelt tier is
        # an error: it would silently put the song in the wrong difficulty.
        tier = row.get("tier")
        if tier is not None and tier not in KNOWN_TIERS:
            rep.error(n, f"unknown tier {tier!r}. Known: {', '.join(KNOWN_TIERS)}")
        else:
            rep.tiers[tier] += 1

        # ── Optional fields ────────────────────────────────────────────────
        aliases = row.get("aliases")
        if aliases is not None:
            if not isinstance(aliases, list) or not all(isinstance(a, str) for a in aliases):
                rep.error(n, "'aliases' must be a list of strings")

        anchor = row.get("anchor")
        if anchor is not None and anchor not in ANCHORS:
            rep.error(n, f"anchor {anchor!r} must be one of {', '.join(sorted(ANCHORS))}")

        start_at = row.get("start_at")
        if start_at is not None:
            if not isinstance(start_at, (int, float)) or isinstance(start_at, bool) or start_at < 0:
                rep.error(n, "'start_at' must be a non-negative number of seconds")

        ladder = row.get("ladder")
        if ladder is not None:
            ok = (
                isinstance(ladder, list) and ladder
                and all(isinstance(x, (int, float)) and not isinstance(x, bool) and x > 0 for x in ladder)
            )
            if not ok:
                rep.error(n, "'ladder' must be a non-empty list of positive numbers")
            elif note := _ingest.long_ladder_note(ladder):
                rep.warn(n, note)

        unknown = set(row) - {
            "id", "title", "artist", "url", "genre", "tier", "aliases",
            "anchor", "start_at", "ladder",
        }
        if unknown:
            rep.warn(n, f"unrecognised field(s): {', '.join(sorted(unknown))}")

    genres["__total__"] = total
    return rep, genres


def print_distribution(genres: Counter) -> None:
    total = genres.pop("__total__", 0)
    print(f"\n{total} song(s)\n")
    print(f"  {'genre':<12} {'have':>5} {'target':>7}   coverage")
    for slug in KNOWN_GENRES:
        have = genres.get(slug, 0)
        target = TARGETS.get(slug, 0)
        if target:
            pct = min(have / target, 1.0)
            bar = "█" * round(pct * 20)
            print(f"  {slug:<12} {have:>5} {target:>7}   {bar:<20} {pct * 100:3.0f}%")
        else:
            print(f"  {slug:<12} {have:>5} {'—':>7}")
    short = [s for s in KNOWN_GENRES if TARGETS.get(s) and genres.get(s, 0) < TARGETS[s]]
    if short:
        print(f"\n  still short in: {', '.join(short)}")


def print_tiers(tiers: Counter) -> None:
    print("\n  difficulty tiers")
    for slug in KNOWN_TIERS:
        print(f"  {slug:<12} {tiers.get(slug, 0):>5}")
    untagged = tiers.get(None, 0)
    if untagged:
        print(f"  {'(untagged)':<12} {untagged:>5}   play as medium — tag them for real tiers")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("seed", type=Path, nargs="?", default=Path("seed.jsonl"))
    ap.add_argument("--quiet", action="store_true", help="Errors only, no distribution report.")
    args = ap.parse_args()

    if not args.seed.exists():
        print(f"no such file: {args.seed}", file=sys.stderr)
        return 1

    rep, genres = validate(args.seed)

    if rep.errors:
        print(f"ERRORS ({len(rep.errors)}):", file=sys.stderr)
        print("\n".join(rep.errors), file=sys.stderr)
    if rep.warnings:
        print(f"\nwarnings ({len(rep.warnings)}):", file=sys.stderr)
        print("\n".join(rep.warnings), file=sys.stderr)

    if not args.quiet:
        print_distribution(genres)
        print_tiers(rep.tiers)

    if rep.errors:
        print(f"\nFAILED — {len(rep.errors)} error(s) to fix before ingesting.")
        return 1
    print("\nOK" + (f" — {len(rep.warnings)} warning(s) worth a look." if rep.warnings else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
