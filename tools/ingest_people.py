#!/usr/bin/env python3
"""Download People photos into the local master; optionally publish to private COS.

    python tools/ingest_people.py .scratch/people/candidates.jsonl
    python tools/ingest_people.py --publish
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import ingest
from validate_people_seed import load_seed

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "apps/web/public/assets/people"
MAX_SIZE = 1600
PAUSE = 2.0
RETRIES = 6
MAX_WAIT = 900
_last_request: dict[str, float] = {}


def warn(message: str) -> None:
    print(f"warning: {message}", file=sys.stderr)


def fetch_image(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "WhatTheSongPeopleIngest/1.0"})
    host = urlparse(url).hostname or ""
    for attempt in range(RETRIES):
        idle = PAUSE - (time.monotonic() - _last_request.get(host, float("-inf")))
        if idle > 0:
            time.sleep(idle)
        try:
            _last_request[host] = time.monotonic()
            with urlopen(request, timeout=30) as response:
                if not response.headers.get("Content-Type", "").lower().split(";", 1)[0].strip().startswith("image/"):
                    raise ValueError(f"non-image response from {url}")
                return response.read()
        except (HTTPError, URLError) as exc:
            status = getattr(exc, "code", None)
            retryable = status in (429, 500, 502, 503, 504) or (status is None and isinstance(exc, URLError))
            if not retryable or attempt == RETRIES - 1:
                raise
            retry_after = exc.headers.get("Retry-After") if isinstance(exc, HTTPError) else None
            wait = float(retry_after) if retry_after and retry_after.isdigit() else 5 * 2 ** attempt
            time.sleep(min(wait, MAX_WAIT))
    raise AssertionError("unreachable")


def resize_jpeg(source: bytes) -> tuple[bytes, tuple[int, int]]:
    try:
        from PIL import Image, ImageOps, UnidentifiedImageError
    except ImportError as exc:
        raise RuntimeError("People ingest requires Pillow (pip install Pillow)") from exc
    try:
        with Image.open(io.BytesIO(source)) as original:
            image = ImageOps.exif_transpose(original)
            image.load()
            if image.width <= 0 or image.height <= 0:
                raise ValueError("unreadable image")
            size = image.size
            image.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)
            if image.mode != "RGB":
                background = Image.new("RGB", image.size, "white")
                if image.mode in ("RGBA", "LA"):
                    background.paste(image, mask=image.getchannel("A"))
                else:
                    background.paste(image.convert("RGB"))
                image = background
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=85, optimize=True, exif=b"")
            return output.getvalue(), size
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("unreadable image") from exc


def existing_photo(folder: Path, photo_url: str) -> str | None:
    """A previously ingested photo for this URL, or None when the cache is missing or unusable."""
    from PIL import Image, UnidentifiedImageError

    source = folder / "source.json"
    try:
        info = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(info, dict) or info.get("photoUrl") != photo_url:
        return None
    filename = info.get("photo")
    if not isinstance(filename, str):
        return None
    if not re.fullmatch(r"[a-f0-9]{24}\.jpg", filename):
        return None
    try:
        with Image.open(folder / filename) as cached:
            cached.verify()
    except (OSError, UnidentifiedImageError):
        return None
    return filename


def ingest_row(row: dict, out: Path) -> dict:
    folder = out / row["id"]
    filename = existing_photo(folder, row["photo_url"])
    if filename is None:
        image, (width, height) = resize_jpeg(fetch_image(row["photo_url"]))
        ratio = height / width
        if not 0.9 <= ratio <= 1.6:
            warn(f"{row['name']}: photo aspect ratio {ratio:.2f} is outside head-and-shoulders range")
        filename = hashlib.sha256(image).hexdigest()[:24] + ".jpg"
        folder.mkdir(parents=True, exist_ok=True)
        destination = folder / filename
        # The name is the content hash, so differing bytes mean the cached file is damaged.
        if not destination.exists() or destination.read_bytes() != image:
            destination.write_bytes(image)
    (folder / "source.json").write_text(json.dumps({"photoUrl": row["photo_url"],
        "sourceUrl": row["source_url"], "photo": filename}, ensure_ascii=False), encoding="utf-8")
    record = {"id": row["id"], "name": row["name"], "field": row["field"],
              "photo": filename, "sourceUrl": row["source_url"]}
    for key in ("aliases", "tier"):
        if key in row:
            record[key] = row[key]
    fractions = row.get("revealFractions", row.get("reveal_fractions"))
    if fractions is not None:
        record["revealFractions"] = fractions
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("seed", nargs="?", type=Path)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.seed and not args.publish:
        parser.error("a seed or --publish is required")
    if args.dry_run and not args.publish:
        parser.error("--dry-run requires --publish")
    if args.out.name != "people":
        parser.error("--out must end in people so COS keys use the people/ prefix")
    try:
        if args.seed and not args.dry_run:
            rows = load_seed(args.seed)
            records = []
            for number, row in enumerate(rows, 1):
                print(f"[{number}/{len(rows)}] {row['name']}", flush=True)
                records.append(ingest_row(row, args.out))
            ingest.write_catalogue(args.out, records)
            print(f"wrote {len(records)} Persons to {args.out / 'catalogue.json'}")
        if args.publish:
            ingest.publish_from_env(args.out, dry_run=args.dry_run)
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"People ingest failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
