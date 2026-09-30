#!/usr/bin/env python3
"""Tests for tools/validate_seed.py.  Run: python tools/test_validate_seed.py"""

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("validate_seed", ROOT / "tools" / "validate_seed.py")
v = importlib.util.module_from_spec(spec)
sys.modules["validate_seed"] = v
spec.loader.exec_module(v)

GOOD = ('{"id":"nnca","title":"Nơi Này Có Anh","artist":"Sơn Tùng M-TP",'
        '"url":"https://www.youtube.com/watch?v=abc123xyz","genre":"nhac-tre"}')


def check(*lines: str):
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "s.jsonl"
        p.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return v.validate(p)


class TestAcceptsGoodInput(unittest.TestCase):
    def test_a_valid_row_passes_clean(self):
        rep, genres = check(GOOD)
        self.assertEqual(rep.errors, [])
        self.assertEqual(rep.warnings, [])
        self.assertEqual(genres["nhac-tre"], 1)

    def test_comments_and_blank_lines_are_ignored(self):
        rep, genres = check("// a comment", "", GOOD, "   ")
        self.assertEqual(rep.errors, [])
        self.assertEqual(genres["__total__"], 1)

    def test_optional_fields_accepted(self):
        rep, _ = check(GOOD.replace(
            '"genre":"nhac-tre"',
            '"genre":"nhac-tre","aliases":["Right Here"],"anchor":"intro",'
            '"start_at":42.5,"ladder":[0.5,1,2]'))
        self.assertEqual(rep.errors, [])


class TestCatchesBreakingMistakes(unittest.TestCase):
    """Errors — these would actually break ingest or the game."""

    def test_duplicate_id_would_overwrite_clips(self):
        rep, _ = check(GOOD, GOOD.replace('"title":"Nơi Này Có Anh"', '"title":"Khác"')
                                  .replace("abc123xyz", "zzz999yyy"))
        self.assertTrue(any("duplicate id" in e for e in rep.errors), rep.errors)

    def test_duplicate_song_across_diacritics(self):
        dupe = GOOD.replace('"id":"nnca"', '"id":"nnca2"') \
                   .replace('"title":"Nơi Này Có Anh"', '"title":"noi nay co anh"') \
                   .replace("abc123xyz", "zzz999yyy")
        rep, _ = check(GOOD, dupe)
        self.assertTrue(any("duplicate song" in e for e in rep.errors), rep.errors)

    def test_duplicate_url(self):
        rep, _ = check(GOOD, GOOD.replace('"id":"nnca"', '"id":"other"')
                                  .replace('"title":"Nơi Này Có Anh"', '"title":"Bài Khác"'))
        self.assertTrue(any("duplicate url" in e for e in rep.errors), rep.errors)

    def test_unknown_genre(self):
        rep, _ = check(GOOD.replace("nhac-tre", "k-pop"))
        self.assertTrue(any("unknown genre" in e for e in rep.errors), rep.errors)

    def test_missing_genre(self):
        rep, _ = check(GOOD.replace(',"genre":"nhac-tre"', ""))
        self.assertTrue(any("missing 'genre'" in e for e in rep.errors), rep.errors)

    def test_title_with_video_markers_makes_a_round_unwinnable(self):
        for bad in ["Nơi Này Có Anh (Official MV)", "Nơi Này Có Anh [Lyrics]",
                    "Nơi Này Có Anh feat. Ai Đó", "Bài Hát Remix"]:
            rep, _ = check(GOOD.replace("Nơi Này Có Anh", bad))
            self.assertTrue(any("video/release markers" in e for e in rep.errors), bad)

    def test_missing_required_fields(self):
        for field in ("id", "title", "artist", "url"):
            row = GOOD.replace(f'"{field}":"', '"_removed":"', 1)
            rep, _ = check(row)
            self.assertTrue(any(field in e for e in rep.errors), f"{field}: {rep.errors}")

    def test_bad_id_format(self):
        rep, _ = check(GOOD.replace('"id":"nnca"', '"id":"Nơi Này"'))
        self.assertTrue(any("[a-z0-9-]" in e for e in rep.errors), rep.errors)

    def test_non_youtube_url(self):
        rep, _ = check(GOOD.replace("https://www.youtube.com/watch?v=abc123xyz",
                                    "https://example.com/song.mp3"))
        self.assertTrue(any("YouTube" in e for e in rep.errors), rep.errors)

    def test_youtube_url_variants_are_accepted(self):
        for u in ["https://youtu.be/abc123xyz",
                  "https://m.youtube.com/watch?v=abc123xyz",
                  "https://music.youtube.com/watch?v=abc123xyz"]:
            rep, _ = check(GOOD.replace("https://www.youtube.com/watch?v=abc123xyz", u))
            self.assertEqual(rep.errors, [], u)

    def test_malformed_json_is_reported_not_fatal(self):
        rep, genres = check("{not json", GOOD)
        self.assertTrue(any("not valid JSON" in e for e in rep.errors))
        self.assertEqual(genres["__total__"], 1, "the good row still counted")

    def test_bad_optional_field_types(self):
        cases = [
            ('"aliases":"a string"', "aliases"),
            ('"anchor":"middle"', "anchor"),
            ('"start_at":-5', "start_at"),
            ('"ladder":[]', "ladder"),
            ('"ladder":[0,1]', "ladder"),
        ]
        for frag, expect in cases:
            rep, _ = check(GOOD.replace('"genre":"nhac-tre"', f'"genre":"nhac-tre",{frag}'))
            self.assertTrue(any(expect in e for e in rep.errors), f"{frag}: {rep.errors}")

    def test_booleans_are_not_numbers(self):
        # True == 1 in Python, so start_at:true must not sneak through.
        rep, _ = check(GOOD.replace('"genre":"nhac-tre"', '"genre":"nhac-tre","start_at":true'))
        self.assertTrue(any("start_at" in e for e in rep.errors), rep.errors)


class TestWarnings(unittest.TestCase):
    """Judgement calls — worth a look, but not breakage."""

    def test_english_title_warns_rather_than_fails(self):
        rep, _ = check(GOOD.replace("Nơi Này Có Anh", "Bigcityboi"))
        self.assertEqual(rep.errors, [])
        self.assertTrue(any("no diacritics" in w for w in rep.warnings), rep.warnings)

    def test_all_caps_title(self):
        rep, _ = check(GOOD.replace("Nơi Này Có Anh", "NƠI NÀY CÓ ANH"))
        self.assertTrue(any("ALL CAPS" in w for w in rep.warnings), rep.warnings)

    def test_unrecognised_field(self):
        rep, _ = check(GOOD.replace('"genre":"nhac-tre"', '"genre":"nhac-tre","mood":"sad"'))
        self.assertEqual(rep.errors, [])
        self.assertTrue(any("unrecognised" in w for w in rep.warnings), rep.warnings)


class TestHelpers(unittest.TestCase):
    def test_fold_strips_diacritics_and_punctuation(self):
        self.assertEqual(v.fold("Nơi Này Có Anh"), "noi nay co anh")
        self.assertEqual(v.fold("Đường Về!"), "duong ve")
        self.assertEqual(v.fold("Nơi Này Có Anh"), v.fold("noi  nay co anh"))

    def test_has_diacritics(self):
        self.assertTrue(v.has_diacritics("Nơi"))
        self.assertTrue(v.has_diacritics("Đường"))
        self.assertFalse(v.has_diacritics("Bigcityboi"))

    def test_targets_cover_every_known_genre(self):
        # Otherwise the coverage report silently omits a genre.
        for slug in v.KNOWN_GENRES:
            self.assertIn(slug, v.TARGETS, slug)

    def test_example_seed_is_valid(self):
        rep, _ = v.validate(ROOT / "tools" / "seed.example.jsonl")
        self.assertEqual(rep.errors, [], rep.errors)


if __name__ == "__main__":
    unittest.main(verbosity=1)
