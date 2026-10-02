#!/usr/bin/env python3
"""Tests for Food JSONL seed validation."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_food_seed import load_seed, validate_rows

URL = "https://commons.wikimedia.org/wiki/File:Pho.jpg"


def row(name, **extra):
    return {"name": name, "aliases": [], "tier": "easy", "region": "Bắc", "commons_url": URL, **extra}


class SeedTests(unittest.TestCase):
    def test_real_format_and_optional_focal_point(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "seed.jsonl"
            path.write_text('// comment\n' + json.dumps(row("Phở", focalPoint={"x": 0.3, "y": 0.7}), ensure_ascii=False) + '\n')
            self.assertEqual(load_seed(path)[0]["id"], "pho")

    def test_alias_collides_after_accent_folding(self):
        with self.assertRaisesRegex(ValueError, "Alias collides"):
            validate_rows([row("Phở", aliases=["Bún bò Huế"]), row("Mì Quảng", aliases=["bun bo hue"])])
        with self.assertRaisesRegex(ValueError, "name collides"):
            validate_rows([row("Phở", aliases=["Bún bò Huế"]), row("bun bo hue")])

    def test_duplicate_id_and_invalid_region(self):
        with self.assertRaisesRegex(ValueError, "duplicate id"):
            validate_rows([row("Phở"), row("Pho")])
        with self.assertRaisesRegex(ValueError, "invalid region"):
            validate_rows([row("Phở", region="Miền Bắc")])

    def test_requires_commons_file_url_and_valid_focal_point(self):
        with self.assertRaisesRegex(ValueError, "Commons File"):
            validate_rows([row("Phở", commons_url="https://example.com/image.jpg")])
        with self.assertRaisesRegex(ValueError, "focal point"):
            validate_rows([row("Phở", focalPoint={"x": True, "y": 0.5})])


if __name__ == "__main__":
    unittest.main()
