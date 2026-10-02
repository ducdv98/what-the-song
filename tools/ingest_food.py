#!/usr/bin/env python3
"""Ingest Commons photos into the local Food master. Requires Pillow.

    python tools/ingest_food.py .scratch/food/candidates.jsonl --out /path/to/assets/food
    python tools/ingest_food.py --out /path/to/assets/food --publish
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import ingest
from validate_food_seed import commons_title, load_seed

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "apps/web/public/assets/food"
API = "https://commons.wikimedia.org/w/api.php"
MAX_SIZE = 1600
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
    with urlopen(request, timeout=30) as response:
        return response.read()


def commons_info(url: str) -> dict:
    title = commons_title(url)
    query = urlencode({"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata", "titles": title})
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
    image_url = info["url"]
    if not image_url.startswith("https://upload.wikimedia.org/"):
        raise ValueError("unexpected Commons image URL")
    return {"imageUrl": image_url, "credit": {"author": author, "licence": licence, "sourceUrl": source}}


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


def ingest_row(row: dict, out: Path) -> dict:
    info = commons_info(row["commons_url"])
    photo = resize_jpeg(fetch_bytes(info["imageUrl"]))
    filename = hashlib.sha256(photo).hexdigest()[:24] + ".jpg"
    folder = out / row["id"]
    folder.mkdir(parents=True, exist_ok=True)
    destination = folder / filename
    if destination.exists():
        if destination.read_bytes() != photo:
            raise RuntimeError(f"hash collision at {destination}")
    else:
        destination.write_bytes(photo)
    record = {"id": row["id"], "name": row["name"], "photo": filename, "credit": info["credit"]}
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
        records = [ingest_row(row, args.out) for row in rows]
        ingest.write_catalogue(args.out, records)
        print(f"wrote {len(records)} Dishes to {args.out / 'catalogue.json'}")
    if args.publish:
        ingest.publish_from_env(args.out, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
