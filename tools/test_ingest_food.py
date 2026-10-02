#!/usr/bin/env python3
"""Tests for tools/ingest_food.py."""
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ingest
import ingest_food
from validate_food_seed import validate_rows

URL = "https://commons.wikimedia.org/wiki/File:Pho.jpg"
IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/photo.jpg"


def commons_response(licence="CC BY-SA 4.0"):
    return json.dumps({"query": {"pages": {"1": {"imageinfo": [{
        "url": IMAGE_URL,
        "descriptionurl": URL,
        "extmetadata": {
            "LicenseShortName": {"value": licence},
            "Artist": {"value": '<a href="/wiki/User:Alice">Alice</a> &amp; Bob'},
        },
    }]}}}}).encode()


def image_bytes():
    output = io.BytesIO()
    Image.new("RGB", (2000, 1000), "red").save(output, "PNG")
    return output.getvalue()


class FakeCos:
    def __init__(self, existing=()):
        self.keys = set(existing)
        self.calls = []

    def list_objects(self, **kw):
        self.calls.append(("list", kw["Prefix"]))
        return {"Contents": [{"Key": key} for key in sorted(self.keys) if key.startswith(kw["Prefix"])]}

    def put_object(self, **kw):
        self.calls.append(("put", kw))
        forbid = kw.get("Metadata", {}).get("x-cos-forbid-overwrite") == "true"
        if forbid and kw["Key"] in self.keys:
            raise RuntimeError("overwrite")
        self.keys.add(kw["Key"])


class FoodIngestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name) / "food"
        self.row = {"name": "Phở", "aliases": ["Phở bò"], "tier": "easy",
                    "region": "Toàn quốc", "commons_url": URL,
                    "focalPoint": {"x": 0.4, "y": 0.6}}

    def tearDown(self):
        self.tmp.cleanup()

    def fake_fetch(self, url):
        return commons_response() if url.startswith(ingest_food.API) else image_bytes()

    def test_ingest_writes_dish_shape_and_resized_photo(self):
        with mock.patch.object(ingest_food, "fetch_bytes", side_effect=self.fake_fetch):
            record = ingest_food.ingest_row(validate_rows([self.row])[0], self.out)
        self.assertEqual(record["id"], "pho")
        self.assertEqual(record["credit"], {"author": "Alice & Bob", "licence": "CC BY-SA 4.0", "sourceUrl": URL})
        self.assertEqual(record["focalPoint"], {"x": 0.4, "y": 0.6})
        with Image.open(self.out / "pho" / record["photo"]) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertEqual(image.size, (1600, 800))
        ingest.write_catalogue(self.out, [record])
        self.assertEqual(json.loads((self.out / "catalogue.json").read_text()), [record])
        source = (Path(__file__).resolve().parent.parent / "packages/topic-food/src/catalogue.ts").as_uri()
        result = subprocess.run([
            "node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning",
            "--input-type=module", "-e",
            "import fs from 'node:fs'; import { validateCatalogue } from " + json.dumps(source) +
            "; validateCatalogue(JSON.parse(fs.readFileSync(process.argv[1], 'utf8')));",
            str(self.out / "catalogue.json"),
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_refuses_unsupported_licence_before_download(self):
        with mock.patch.object(ingest_food, "fetch_bytes", return_value=commons_response("CC BY-NC 4.0")) as fetch:
            with self.assertRaisesRegex(ValueError, "unsupported Commons licence"):
                ingest_food.ingest_row(validate_rows([self.row])[0], self.out)
        self.assertEqual(fetch.call_count, 1)
        self.assertFalse(self.out.exists())

    def test_publish_assets_before_catalogue_and_never_overwrites_assets(self):
        with mock.patch.object(ingest_food, "fetch_bytes", side_effect=self.fake_fetch):
            record = ingest_food.ingest_row(validate_rows([self.row])[0], self.out)
        ingest.write_catalogue(self.out, [record])
        asset = f"food/pho/{record['photo']}"
        cos = FakeCos()
        ingest.publish_library(self.out, cos, "bucket")
        self.assertEqual([call[1]["Key"] for call in cos.calls if call[0] == "put"],
                         [asset, "food/catalogue.json"])
        self.assertTrue(all(call[1]["Metadata"] == {"x-cos-forbid-overwrite": "true"}
                            for call in cos.calls if call[0] == "put" and call[1]["Key"] == asset))
        # A second publish skips the existing asset and only refreshes the catalogue.
        ingest.publish_library(self.out, cos, "bucket")
        puts = [call[1]["Key"] for call in cos.calls if call[0] == "put"]
        self.assertEqual(puts, [asset, "food/catalogue.json", "food/catalogue.json"])

    def test_existing_asset_is_skipped(self):
        with mock.patch.object(ingest_food, "fetch_bytes", side_effect=self.fake_fetch):
            record = ingest_food.ingest_row(validate_rows([self.row])[0], self.out)
        ingest.write_catalogue(self.out, [record])
        asset = f"food/pho/{record['photo']}"
        cos = FakeCos([asset])
        ingest.publish_library(self.out, cos, "bucket")
        self.assertEqual([call[1]["Key"] for call in cos.calls if call[0] == "put"],
                         ["food/catalogue.json"])

    def test_rerun_reuses_the_photo_unless_the_commons_file_changed(self):
        with mock.patch.object(ingest_food, "fetch_bytes", side_effect=self.fake_fetch) as fetch:
            first = ingest_food.ingest_row(validate_rows([self.row])[0], self.out)
            calls = fetch.call_count
            again = ingest_food.ingest_row(validate_rows([self.row])[0], self.out)
            self.assertEqual(first, again)
            self.assertEqual(fetch.call_count, calls + 1)  # metadata only, no photo
            other = dict(self.row, commons_url=URL.replace("Pho", "Other"))
            ingest_food.ingest_row(validate_rows([other])[0], self.out)
            self.assertEqual(fetch.call_count, calls + 3)  # metadata and a fresh photo

    def test_commons_info_prefers_the_thumbnail_rendition(self):
        data = json.loads(commons_response())
        info = data["query"]["pages"]["1"]["imageinfo"][0]
        info["thumburl"] = "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/photo.jpg/1600px-photo.jpg"
        with mock.patch.object(ingest_food, "fetch_bytes", return_value=json.dumps(data).encode()):
            self.assertEqual(ingest_food.commons_info(URL)["imageUrl"], info["thumburl"])

    def test_commons_info_rejects_a_non_wikimedia_image_host(self):
        data = json.loads(commons_response())
        data["query"]["pages"]["1"]["imageinfo"][0]["thumburl"] = "https://evil.example/photo.jpg"
        with mock.patch.object(ingest_food, "fetch_bytes", return_value=json.dumps(data).encode()):
            with self.assertRaisesRegex(ValueError, "unexpected Commons image URL"):
                ingest_food.commons_info(URL)

    def test_fetch_retries_after_a_429_and_gives_up_on_a_404(self):
        from urllib.error import HTTPError
        class Response:
            def __enter__(self): return self
            def __exit__(self, *a): return False
            def read(self): return b"ok"
        limited = HTTPError("u", 429, "Too many requests", {"Retry-After": "1"}, None)
        with mock.patch.object(ingest_food, "urlopen", side_effect=[limited, Response()]) as opened, \
                mock.patch.object(ingest_food.time, "sleep") as sleep:
            self.assertEqual(ingest_food.fetch_bytes("https://example.test"), b"ok")
        self.assertEqual(opened.call_count, 2)
        sleep.assert_called_once_with(1.0)
        missing = HTTPError("u", 404, "Not found", {}, None)
        with mock.patch.object(ingest_food, "urlopen", side_effect=missing) as opened:
            with self.assertRaises(HTTPError):
                ingest_food.fetch_bytes("https://example.test")
        self.assertEqual(opened.call_count, 1)


if __name__ == "__main__":
    unittest.main()
