#!/usr/bin/env python3
"""Tests for the People photo ingest and COS publish path."""
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ingest
import ingest_people
from validate_people_seed import validate_rows


def photo(size=(1800, 2200)):
    out = io.BytesIO()
    Image.new("RGB", size, "red").save(out, "PNG")
    return out.getvalue()


def person(name="Sơn Tùng M-TP", **changes):
    row = {"name": name, "aliases": ["Nguyễn Thanh Tùng"], "tier": "easy",
           "field": "Ca sĩ", "photo_url": "https://images.example/photo.png",
           "source_url": "https://example.com/source"}
    row.update(changes)
    return validate_rows([row])[0]


class FakeCos:
    def __init__(self):
        self.keys = set()
        self.puts = []

    def list_objects(self, **kw):
        return {"Contents": [{"Key": key} for key in self.keys if key.startswith(kw["Prefix"])]}

    def put_object(self, **kw):
        self.puts.append(kw)
        self.keys.add(kw["Key"])


class PeopleIngestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name) / "people"

    def tearDown(self):
        self.tmp.cleanup()

    def test_small_seed_produces_typescript_valid_catalogue(self):
        rows = [person(revealFractions=[.2, .4, .6, .8, 1]),
                person("Mỹ Tâm", aliases=[], field="Ca sĩ")]
        with mock.patch.object(ingest_people, "fetch_image", return_value=photo()) as fetch:
            records = [ingest_people.ingest_row(row, self.out) for row in rows]
        self.assertEqual(fetch.call_count, 2)
        ingest.write_catalogue(self.out, records)
        catalogue = json.loads((self.out / "catalogue.json").read_text())
        self.assertEqual(catalogue[0]["sourceUrl"], "https://example.com/source")
        self.assertEqual(catalogue[0]["revealFractions"], [.2, .4, .6, .8, 1])
        self.assertEqual(json.loads((self.out / "son-tung-m-tp" / "source.json").read_text()),
                         {"photoUrl": "https://images.example/photo.png", "sourceUrl": "https://example.com/source", "photo": records[0]["photo"]})
        with Image.open(self.out / "son-tung-m-tp" / records[0]["photo"]) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertEqual(max(image.size), 1600)
        source = (Path(__file__).resolve().parent.parent / "packages/topic-people/src/catalogue.ts").as_uri()
        result = subprocess.run([
            "node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning",
            "--input-type=module", "-e",
            "import fs from 'node:fs'; import { validateCatalogue } from " + json.dumps(source) +
            "; validateCatalogue(JSON.parse(fs.readFileSync(process.argv[1], 'utf8')));",
            str(self.out / "catalogue.json"),
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("credit", json.dumps(catalogue).lower())
        self.assertNotIn("licence", json.dumps(catalogue).lower())

    def test_unreadable_image_and_nonimage_response_are_refused(self):
        with mock.patch.object(ingest_people, "fetch_image", return_value=b"not an image"):
            with self.assertRaisesRegex(ValueError, "image"):
                ingest_people.ingest_row(person(), self.out)
        self.assertFalse(self.out.exists())

        class Response:
            headers = {"Content-Type": "text/html"}
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self): return photo()
        with mock.patch.object(ingest_people, "urlopen", return_value=Response()):
            with self.assertRaisesRegex(ValueError, "non-image"):
                ingest_people.fetch_image("https://images.example/photo.png")

    def test_wide_photo_warns_and_rerun_uses_cached_photo(self):
        row = person()
        with mock.patch.object(ingest_people, "fetch_image", return_value=photo((2200, 900))) as fetch, \
             mock.patch.object(ingest_people, "warn") as warn:
            first = ingest_people.ingest_row(row, self.out)
            second = ingest_people.ingest_row(row, self.out)
        self.assertEqual(first, second)
        self.assertEqual(fetch.call_count, 1)
        warn.assert_called()

    def test_corrupt_cached_photo_is_downloaded_again(self):
        row = person()
        with mock.patch.object(ingest_people, "fetch_image", return_value=photo()) as fetch:
            first = ingest_people.ingest_row(row, self.out)
            cached = self.out / row["id"] / first["photo"]
            cached.write_bytes(b"broken")
            second = ingest_people.ingest_row(row, self.out)
        self.assertEqual(first, second)
        self.assertEqual(fetch.call_count, 2)
        Image.open(cached).verify()

    def test_malformed_cache_metadata_is_a_cache_miss(self):
        row = person()
        folder = self.out / row["id"]
        folder.mkdir(parents=True)
        for metadata in ('["not", "an", "object"]', json.dumps(
                {"photoUrl": row["photo_url"], "photo": "z" * 24 + ".jpg"})):
            (folder / "source.json").write_text(metadata)
            (folder / ("z" * 24 + ".jpg")).write_bytes(photo())
            with self.subTest(metadata=metadata), \
                    mock.patch.object(ingest_people, "fetch_image", return_value=photo()) as fetch:
                ingest_people.ingest_row(row, self.out)
                self.assertEqual(fetch.call_count, 1)

    def test_changed_photo_url_creates_new_hash_without_overwriting_old(self):
        first = person()
        second = person(photo_url="https://images.example/other.png")
        with mock.patch.object(ingest_people, "fetch_image", side_effect=[photo(), photo((1000, 1300))]) as fetch:
            old = ingest_people.ingest_row(first, self.out)
            new = ingest_people.ingest_row(second, self.out)
            self.assertEqual(ingest_people.ingest_row(second, self.out), new)
        self.assertEqual(fetch.call_count, 2)
        self.assertNotEqual(old["photo"], new["photo"])
        self.assertTrue((self.out / old["id"] / old["photo"]).exists())

    def test_publish_uploads_only_referenced_asset_before_catalogue(self):
        with mock.patch.object(ingest_people, "fetch_image", return_value=photo()):
            record = ingest_people.ingest_row(person(), self.out)
        ingest.write_catalogue(self.out, [record])
        cos = FakeCos()
        ingest.publish_library(self.out, cos, "bucket")
        self.assertEqual([kw["Key"] for kw in cos.puts],
                         [f"people/{record['id']}/{record['photo']}", "people/catalogue.json"])
        self.assertEqual(cos.puts[0]["Metadata"], {"x-cos-forbid-overwrite": "true"})
        ingest.publish_library(self.out, cos, "bucket")
        self.assertEqual([kw["Key"] for kw in cos.puts][-1], "people/catalogue.json")
        self.assertEqual(len(cos.puts), 3)

    def test_fetch_is_paced_and_retries_429(self):
        class Response:
            headers = {"Content-Type": "image/png"}
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self): return b"image"
        ingest_people._last_request.clear()
        limited = HTTPError("u", 429, "limited", {"Retry-After": "1"}, None)
        with mock.patch.object(ingest_people, "urlopen", side_effect=[limited, Response(), Response()]) as opened, \
             mock.patch.object(ingest_people.time, "sleep") as sleep:
            ingest_people.fetch_image("https://images.example/one")
            ingest_people.fetch_image("https://images.example/two")
        self.assertEqual(opened.call_count, 3)
        self.assertGreaterEqual(sleep.call_count, 2)


if __name__ == "__main__":
    unittest.main()
