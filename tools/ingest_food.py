#!/usr/bin/env python3
"""Ingest open-licensed photos into the local Food master. Requires Pillow.

Each seed row names its photo with exactly one of `commons_url` (a Wikimedia Commons
File page) or `openverse_id` (an Openverse image id, which covers Flickr and other
hosts). Mixing sources spreads the load so no single host rate-limits a large seed.

    python tools/ingest_food.py .scratch/food/candidates.jsonl --out /path/to/assets/food
    python tools/ingest_food.py --out /path/to/assets/food --publish
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import time
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import ingest
from validate_food_seed import commons_title, load_seed

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "apps/web/public/assets/food"
API = "https://commons.wikimedia.org/w/api.php"
MAX_SIZE = 1600
IMAGE_HOSTS = ("https://upload.wikimedia.org/", "https://thumb.wikimedia.org/")
PAUSE = 2.0  # minimum seconds between requests to one host; Commons rate-limits bursts with 429
OPENVERSE_API = "https://api.openverse.org/v1/images/"
RETRIES = 6
MAX_WAIT = 900  # honour a long Retry-After rather than burning retries
SOURCE_FILE = "source.json"  # which Commons file a Dish's local photo came from
OPENVERSE_LICENCES = {"by": "CC BY", "by-sa": "CC BY-SA", "cc0": "CC0"}
_last_request: dict[str, float] = {}
LICENCE = re.compile(r"^(?:CC BY(?:-SA)?(?: [1-4](?:\.\d)?)?|CC0(?: 1\.0)?)$")


class _PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def plain_html(value: str) -> str:
    parser = _PlainText()
    parser.feed(value)
    return " ".join(unescape("".join(parser.parts)).split())


def fetch_bytes(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "WhatTheSongFoodIngest/1.0 (Commons attribution tool)"})
    host = urlparse(url).hostname or ""
    idle = PAUSE - (time.monotonic() - _last_request.get(host, float("-inf")))
    if idle > 0:
        time.sleep(idle)
    for attempt in range(RETRIES):
        try:
            _last_request[host] = time.monotonic()
            with urlopen(request, timeout=30) as response:
                return response.read()
        except (HTTPError, URLError) as exc:
            status = getattr(exc, "code", None)
            retryable = status in (429, 500, 502, 503, 504) or (status is None and isinstance(exc, URLError))
            if not retryable or attempt == RETRIES - 1:
                raise
            retry_after = exc.headers.get("Retry-After") if isinstance(exc, HTTPError) else None
            wait = float(retry_after) if retry_after and retry_after.isdigit() else 5 * 2 ** attempt
            print(f"  {status or exc.reason}: waiting {wait:.0f}s before retry {attempt + 1}/{RETRIES - 1}", flush=True)
            time.sleep(min(wait, MAX_WAIT))
    raise AssertionError("unreachable")


def commons_info(url: str) -> dict:
    title = commons_title(url)
    query = urlencode({"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": MAX_SIZE, "titles": title})
    data = json.loads(fetch_bytes(f"{API}?{query}"))
    pages = data["query"]["pages"]
    info = next(iter(pages.values()))["imageinfo"][0]
    metadata = info["extmetadata"]
    licence = plain_html(metadata["LicenseShortName"]["value"])
    if not LICENCE.fullmatch(licence):
        raise ValueError(f"unsupported Commons licence: {licence}")
    author = plain_html(metadata["Artist"]["value"])
    if not author:
        raise ValueError("Commons image has no author")
    source = info.get("descriptionurl", url)
    if not source.startswith("https://commons.wikimedia.org/wiki/File:"):
        raise ValueError("invalid Commons source URL")
    # A MAX_SIZE-wide rendition is all we keep, and far lighter than the original.
    image_url = info.get("thumburl") or info["url"]
    if not image_url.startswith(IMAGE_HOSTS):
        raise ValueError("unexpected Commons image URL")
    return {"imageUrl": image_url, "credit": {"author": author, "licence": licence, "sourceUrl": source}}


def openverse_info(image_id: str) -> dict:
    data = json.loads(fetch_bytes(f"{OPENVERSE_API}{image_id}/"))
    licence = OPENVERSE_LICENCES.get(str(data.get("license", "")).lower())
    if not licence:
        raise ValueError(f"unsupported Openverse licence: {data.get('license')}")
    version = str(data.get("license_version") or "")
    if version:
        licence = f"{licence} {version}"
    if not LICENCE.fullmatch(licence):
        raise ValueError(f"unsupported Openverse licence: {licence}")
    author = (data.get("creator") or "").strip()
    if not author:
        raise ValueError("Openverse image has no author")
    source, image_url = data.get("foreign_landing_url") or "", data.get("url") or ""
    if not source.startswith("https://") or not image_url.startswith("https://"):
        raise ValueError("Openverse image needs https source and image URLs")
    return {"imageUrl": image_url, "credit": {"author": author, "licence": licence, "sourceUrl": source}}


def source_ref(row: dict) -> str:
    """The identity of the photo a row asks for; a change re-downloads the Dish."""
    return row["commons_url"] if "commons_url" in row else f"openverse:{row['openverse_id']}"


def source_info(row: dict) -> dict:
    return commons_info(row["commons_url"]) if "commons_url" in row else openverse_info(row["openverse_id"])


def resize_jpeg(source: bytes) -> bytes:
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise RuntimeError("Food ingest requires Pillow (pip install Pillow)") from exc
    with Image.open(io.BytesIO(source)) as original:
        image = ImageOps.exif_transpose(original)
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
        return output.getvalue()


def existing_photo(folder: Path, ref: str) -> tuple[str, dict | None] | None:
    """The photo already ingested for this Dish from this source, with its cached
    Credit when known, so a rerun after an interruption costs no requests. A folder
    with no record of its source (an interrupted earlier run) is trusted once."""
    photos = sorted(folder.glob("*.jpg")) if folder.is_dir() else []
    if len(photos) != 1 or not re.fullmatch(r"[a-f0-9]{24}\.jpg", photos[0].name):
        return None
    record = folder / SOURCE_FILE
    if not record.is_file():
        return photos[0].name, None
    try:
        data = json.loads(record.read_text(encoding="utf-8"))
    except ValueError:
        return None
    if data.get("source", data.get("commonsUrl")) != ref:
        return None
    return photos[0].name, data.get("credit")


def write_source(folder: Path, ref: str, credit: dict) -> None:
    (folder / SOURCE_FILE).write_text(json.dumps({"source": ref, "credit": credit}), encoding="utf-8")


def ingest_row(row: dict, out: Path) -> dict:
    ref = source_ref(row)
    folder = out / row["id"]
    cached = existing_photo(folder, ref)
    info = None
    if cached and cached[1]:
        filename, credit = cached
    else:
        info = source_info(row)
        credit = info["credit"]
        filename = cached[0] if cached else None
    if filename is None:
        photo = resize_jpeg(fetch_bytes(info["imageUrl"]))
        filename = hashlib.sha256(photo).hexdigest()[:24] + ".jpg"
        folder.mkdir(parents=True, exist_ok=True)
        destination = folder / filename
        if destination.exists():
            if destination.read_bytes() != photo:
                raise RuntimeError(f"hash collision at {destination}")
        else:
            destination.write_bytes(photo)
    if not cached or not cached[1]:
        write_source(folder, ref, credit)
    record = {"id": row["id"], "name": row["name"], "photo": filename, "credit": credit}
    for key in ("aliases", "tier", "region"):
        if key in row:
            record[key] = row[key]
    if "focalPoint" in row or "focal_point" in row:
        record["focalPoint"] = row.get("focalPoint", row.get("focal_point"))
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
    if args.out.name != "food":
        parser.error("--out must end in food so COS keys use the food/ prefix")
    if args.seed:
        rows = load_seed(args.seed)
        records = []
        for number, row in enumerate(rows, 1):
            print(f"[{number}/{len(rows)}] {row['name']}", flush=True)
            records.append(ingest_row(row, args.out))
        ingest.write_catalogue(args.out, records)
        print(f"wrote {len(records)} Dishes to {args.out / 'catalogue.json'}")
    if args.publish:
        ingest.publish_from_env(args.out, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
