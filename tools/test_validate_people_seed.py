#!/usr/bin/env python3
"""Tests for People JSONL seed validation."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_people_seed import load_seed, validate_rows


def person(name="Sơn Tùng M-TP", **changes):
    row = {"name": name, "aliases": ["Nguyễn Thanh Tùng"], "tier": "easy",
           "field": "Ca sĩ", "photo_url": "https://example.com/photo.png",
           "source_url": "https://example.com/source"}
    row.update(changes)
    return row


class PeopleSeedTests(unittest.TestCase):
    def test_loads_jsonl_and_optional_reveal(self):
        with tempfile.TemporaryDirectory() as tmp:
            seed = Path(tmp) / "seed.jsonl"
            seed.write_text('// comment\n' + json.dumps(person(revealFractions=[.2, .4, .6, .8, 1])) + '\n')
            self.assertEqual(load_seed(seed)[0]["id"], "son-tung-m-tp")

    def test_real_seed_is_valid(self):
        seed = Path(__file__).resolve().parent.parent / ".scratch/people/candidates.jsonl"
        self.assertTrue(load_seed(seed))

    def test_refuses_missing_or_blank_source(self):
        for source in (None, "", "  "):
            row = person(source_url=source)
            with self.subTest(source=source), self.assertRaisesRegex(ValueError, "source_url"):
                validate_rows([row])

    def test_refuses_unknown_field_tier_and_photo_url(self):
        for change, message in (({"field": "Artist"}, "field"),
                                ({"tier": "legendary"}, "tier"),
                                ({"photo_url": None}, "photo_url"),
                                ({"photo_url": "file:///x.png"}, "photo_url")):
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, message):
                validate_rows([person(**change)])

    def test_refuses_alias_collisions_after_accent_folding(self):
        with self.assertRaisesRegex(ValueError, "Alias collides"):
            validate_rows([person(aliases=["Mỹ Tâm"]), person("Ca sĩ Hai", aliases=["My Tam"])])
        with self.assertRaisesRegex(ValueError, "name collides"):
            validate_rows([person(aliases=["Mỹ Tâm"]), person("My Tam", aliases=[])])

    def test_refuses_invalid_reveal_override(self):
        with self.assertRaisesRegex(ValueError, "reveal"):
            validate_rows([person(revealFractions=[.2, .4, .6, .8, .9])])


if __name__ == "__main__":
    unittest.main()
