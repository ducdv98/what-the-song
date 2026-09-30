#!/usr/bin/env python3
"""
Tests for tools/ingest.py. No dependencies — run it directly:

    python tools/test_ingest.py

These exist because a refactor once deleted a block of functions and every
cheap check still passed: the file parsed, --help worked, and the functions
that were spot-tested happened to be the surviving ones. Only running main()
would have caught it, so that is what test_main_wiring does.
"""

import importlib.util
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("ingest", ROOT / "tools" / "ingest.py")
ingest = importlib.util.module_from_spec(spec)
sys.modules["ingest"] = ingest          # dataclasses needs this for annotations
spec.loader.exec_module(ingest)


class TestModuleSurface(unittest.TestCase):
    """Catches a refactor deleting things the CLI depends on."""

    def test_public_names_exist(self):
        for name in (
            "detect_os", "installed_browsers", "auto_cookie_browser",
            "install_hint", "cookie_args", "download_audio", "cut_clips",
            "process", "load_seeds", "main", "run", "probe_duration",
            "choose_anchor", "normalise", "measure_loudness",
            "detect_music_onset", "detect_body_onset", "clip_key",
            "CLIP_LADDER", "_BROWSER_PROFILES",
        ):
            self.assertTrue(hasattr(ingest, name), f"missing: {name}")

    def test_ladder_matches_the_client(self):
        # packages/game/src/ladder.ts DEFAULT_LADDER must agree or clip lookups 404.
        self.assertEqual(ingest.CLIP_LADDER, [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0])

    def test_clip_keys_match_javascript(self):
        # str(1.0) is "1.0" in Python but String(1.0) is "1" in JS, which
        # silently broke every rung from 1s up. Milliseconds are integers in
        # both. The mirror of this lives in packages/game/src/catalogue.test.ts.
        self.assertEqual(
            [ingest.clip_key(s) for s in ingest.CLIP_LADDER],
            ["100", "500", "1000", "2000", "4000", "8000", "16000"],
        )


class TestClipFormat(unittest.TestCase):
    """
    Clips must be MP3. AAC cannot be decoded by decodeAudioData in Chromium
    builds without proprietary codecs, which made the game unplayable there.
    """

    def test_cut_clips_emits_mp3(self):
        src = (ROOT / "tools" / "ingest.py").read_text(encoding="utf-8")
        self.assertIn("libmp3lame", src)
        self.assertIn('+ ".mp3"', src)
        self.assertNotIn('"-c:a", "aac"', src)


class TestGenreTaxonomy(unittest.TestCase):
    """
    The slug list exists in both languages. A drift would file songs under
    "Khác" with no error, so assert they agree by reading the TypeScript.
    """

    def test_slugs_match_the_client(self):
        ts = (ROOT / "packages" / "game" / "src" / "genres.ts").read_text(encoding="utf-8")
        # Only the GENRES array literal, so unrelated strings cannot match.
        body = ts[ts.index("export const GENRES"):ts.index("] as const;")]
        from_ts = re.findall(r"slug: '([a-z-]+)'", body)
        self.assertEqual(from_ts, ingest.KNOWN_GENRES)

    def test_unknown_genre_is_reported_but_not_fatal(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "s.jsonl"
            p.write_text(
                '{"id":"a","title":"T","artist":"A","url":"u","genre":"k-pop"}\n'
                '{"id":"b","title":"T2","artist":"A","url":"u","genre":"bolero"}\n',
                encoding="utf-8",
            )
            seeds = ingest.load_seeds(p)
        # Both load; the bad one is only warned about.
        self.assertEqual([x.id for x in seeds], ["a", "b"])


class TestOsDetection(unittest.TestCase):
    def test_detect_os_is_a_known_value(self):
        self.assertIn(ingest.detect_os(), {"windows", "macos", "linux"})

    def test_install_hints_for_every_os(self):
        for host in ("windows", "macos", "linux"):
            hints = ingest.install_hint(host)
            self.assertTrue(hints)
            self.assertTrue(any("yt-dlp" in h for h in hints), host)


class TestCookieSelection(unittest.TestCase):
    @staticmethod
    def _with_browsers(present):
        return mock.patch.object(
            ingest, "_profile_exists", lambda spec: any(p in spec for p in present)
        )

    def test_firefox_preferred_everywhere(self):
        for host in ("windows", "macos", "linux"):
            with self._with_browsers(["Firefox", ".mozilla"]):
                browser, _ = ingest.auto_cookie_browser(host)
            self.assertEqual(browser, "firefox", host)

    def test_windows_never_picks_a_chromium_browser(self):
        # Chrome 127+ app-bound encryption makes this impossible, not just awkward.
        with self._with_browsers(["Google/Chrome", "Microsoft/Edge"]):
            browser, note = ingest.auto_cookie_browser("windows")
        self.assertIsNone(browser)
        self.assertIn("app-bound", note)

    def test_chromium_is_fine_off_windows(self):
        with self._with_browsers(["google-chrome"]):
            browser, _ = ingest.auto_cookie_browser("linux")
        self.assertEqual(browser, "chrome")

    def test_no_browser_found(self):
        with self._with_browsers([]):
            browser, note = ingest.auto_cookie_browser("linux")
        self.assertIsNone(browser)
        self.assertTrue(note)

    def test_cookie_args(self):
        self.assertEqual(ingest.cookie_args(None, None), [])
        self.assertEqual(
            ingest.cookie_args("firefox", None), ["--cookies-from-browser", "firefox"]
        )
        # An explicit file wins over a browser.
        self.assertEqual(
            ingest.cookie_args("firefox", Path("c.txt")), ["--cookies", "c.txt"]
        )


class TestEncoding(unittest.TestCase):
    """The Windows cp1252 crash: Vietnamese must survive every IO boundary."""

    def test_record_round_trips_as_utf8(self):
        record = {"title": "Nơi Này Có Anh", "artist": "Sơn Tùng M-TP", "genre": "nhạc trẻ"}
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "done.json"
            p.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            self.assertEqual(json.loads(p.read_text(encoding="utf-8")), record)

    def test_run_decodes_utf8_subprocess_output(self):
        out = ingest.run([
            sys.executable, "-c",
            "import sys;sys.stdout.buffer.write('Nơi Này Có Anh'.encode('utf-8'))",
        ])
        self.assertIn("Nơi Này Có Anh", out.stdout)

    def test_run_reports_a_missing_binary(self):
        res = ingest.run(["definitely-not-a-real-binary-xyz"])
        self.assertEqual(res.returncode, 127)
        self.assertIn("not found", res.stderr)

    def test_probe_duration_survives_a_non_audio_file(self):
        self.assertIsInstance(ingest.probe_duration(ROOT / "README.md"), float)


class TestSeeds(unittest.TestCase):
    def test_example_seed_parses(self):
        path = ROOT / "tools" / "seed.example.jsonl"
        # Counted from the file, not hardcoded, so adding an example row to the
        # seed file cannot fail the suite.
        expected = sum(
            1 for ln in path.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.strip().startswith("//")
        )
        seeds = ingest.load_seeds(path)
        self.assertEqual(len(seeds), expected)
        self.assertEqual(seeds[0].title, "Nơi Này Có Anh")
        # Every example row must carry the fields Seed requires.
        for sd in seeds:
            self.assertTrue(sd.id and sd.title and sd.artist and sd.url)

    def test_malformed_lines_are_skipped_not_fatal(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "s.jsonl"
            p.write_text(
                '{"id":"x"}\nnot json\n'
                '{"id":"y","title":"T","artist":"A","url":"u"}\n',
                encoding="utf-8",
            )
            self.assertEqual(len(ingest.load_seeds(p)), 1)


class TestAnchor(unittest.TestCase):
    def _seed(self, **kw):
        base = dict(id="a", title="T", artist="A", url="u")
        return ingest.Seed(**{**base, **kw})

    def test_explicit_start_at_wins(self):
        self.assertEqual(ingest.choose_anchor(self._seed(start_at=42.0), 240.0, 3.2), 42.0)

    def test_intro_mode_uses_detected_onset(self):
        seed = self._seed(anchor="intro")
        self.assertEqual(ingest.choose_anchor(seed, 240.0, 3.2), 3.2)

    def test_default_is_hook_and_clears_the_intro(self):
        # The whole point: a clue taken from the opening of a Vietnamese pop
        # song is generic instrumental, so the default must land well past it.
        seed = self._seed()
        self.assertEqual(seed.anchor, "hook")
        a = ingest.choose_anchor(seed, 240.0, 3.2)
        self.assertGreaterEqual(a, 240.0 * 0.30)
        self.assertLessEqual(a, 240.0 * 0.45)

    def test_hook_is_deterministic_and_mid_track(self):
        seed = self._seed(anchor="hook")
        a = ingest.choose_anchor(seed, 240.0, 0.0)
        self.assertEqual(a, ingest.choose_anchor(seed, 240.0, 0.0))
        self.assertGreaterEqual(a, 240.0 * 0.25)
        self.assertLessEqual(a, 240.0 * 0.60)


class TestSummaryRobustness(unittest.TestCase):
    """The end-of-run summary must survive an incomplete record: it is the last
    thing to print, so crashing there throws away the whole report."""

    def test_summary_tolerates_a_sparse_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "clips"
            argv = ["i", str(ROOT / "tools" / "seed.example.jsonl"), "--out", str(out)]
            sparse = {"id": "a"}          # nothing else at all
            with mock.patch.object(sys, "argv", argv), \
                 mock.patch.object(ingest.shutil, "which", return_value="/usr/bin/x"), \
                 mock.patch.object(ingest, "process", return_value=sparse):
                self.assertEqual(ingest.main(), 0)


class TestLadder(unittest.TestCase):
    def test_per_song_ladder_overrides_the_run(self):
        seed = ingest.Seed(id="a", title="T", artist="A", url="u", ladder=[2.0, 4.0])
        captured = {}

        def fake_cut(src, anchor, out_dir, salt, ladder=None):
            captured["ladder"] = ladder
            out_dir.mkdir(parents=True, exist_ok=True)
            return ({ingest.clip_key(s): f"{s}.mp3" for s in ladder}, [])

        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(ingest, "download_audio", return_value=Path("x.wav")), \
             mock.patch.object(ingest, "probe_duration", return_value=200.0), \
             mock.patch.object(ingest, "detect_music_onset", return_value=0.0), \
             mock.patch.object(ingest, "detect_body_onset", return_value=11.0), \
             mock.patch.object(ingest, "normalise"), \
             mock.patch.object(ingest, "cut_clips", side_effect=fake_cut):
            rec = ingest.process(seed, Path(tmp), ladder=[0.1, 0.5, 1.0])

        # The song's own ladder wins over the run-wide one.
        self.assertEqual(captured["ladder"], [2.0, 4.0])
        self.assertEqual(sorted(rec["clips"].keys()), ["2000", "4000"])

    def test_body_mode_prefers_the_detected_vocal_entry(self):
        seed = ingest.Seed(id="a", title="T", artist="A", url="u", anchor="body")
        # Body onset at 11s must win over a silence trim at 0.4s.
        self.assertEqual(ingest.choose_anchor(seed, 200.0, 0.4, 11.0), 11.0)

    def test_body_mode_falls_back_to_silence_trim_when_undetected(self):
        seed = ingest.Seed(id="a", title="T", artist="A", url="u", anchor="body")
        self.assertEqual(ingest.choose_anchor(seed, 200.0, 0.4, 0.0), 0.4)

    def test_hook_is_stable_across_runs_but_varies_by_song(self):
        a1 = ingest.choose_anchor(ingest.Seed(id="one", title="T", artist="A", url="u"), 240.0, 0.0)
        a2 = ingest.choose_anchor(ingest.Seed(id="one", title="T", artist="A", url="u"), 240.0, 0.0)
        b = ingest.choose_anchor(ingest.Seed(id="two", title="T", artist="A", url="u"), 240.0, 0.0)
        self.assertEqual(a1, a2, "same song must anchor identically on re-run")
        self.assertNotEqual(a1, b, "different songs should not share an anchor")

    def test_intro_mode_still_uses_the_silence_trim(self):
        seed = ingest.Seed(id="a", title="T", artist="A", url="u", anchor="intro")
        self.assertEqual(ingest.choose_anchor(seed, 200.0, 0.4, 11.0), 0.4)

    def test_start_at_beats_every_detector(self):
        seed = ingest.Seed(id="a", title="T", artist="A", url="u", start_at=33.0)
        self.assertEqual(ingest.choose_anchor(seed, 200.0, 0.4, 11.0), 33.0)


class TestOutputLayout(unittest.TestCase):
    """
    The app fetches /clips/catalogue.json and /clips/<id>/<hash>.m4a from one
    base, so catalogue.json and the per-song dirs must be siblings under --out.
    A stray path segment 404s every clip while the catalogue still loads, which
    reads like a server misconfiguration instead of a path bug.
    """

    def test_clips_are_siblings_of_the_catalogue(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "clips"
            seed = ingest.Seed(id="abc", title="T", artist="A", url="u")

            with mock.patch.object(ingest, "download_audio", return_value=Path("x.wav")), \
                 mock.patch.object(ingest, "probe_duration", return_value=120.0), \
                 mock.patch.object(ingest, "detect_music_onset", return_value=0.0), \
                 mock.patch.object(ingest, "normalise"), \
                 mock.patch.object(
                     ingest, "cut_clips",
                     side_effect=lambda src, anchor, out_dir, salt, ladder=None: (
                         out_dir.mkdir(parents=True, exist_ok=True),
                         ({"100": "deadbeef.mp3"}, []),
                     )[1],
                 ):
                rec = ingest.process(seed, out)

            self.assertIsNotNone(rec)
            # <out>/abc/, NOT <out>/clips/abc/
            self.assertTrue((out / "abc").is_dir(), sorted(p.name for p in out.iterdir()))
            self.assertFalse((out / "clips").exists(), "stray 'clips' path segment")


class TestMainWiring(unittest.TestCase):
    """
    Runs main() end to end with the tools faked present and the per-song work
    stubbed out. This is the test that catches a deleted function: every name
    main() touches has to resolve.
    """

    def test_main_wiring(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "clips"
            argv = ["ingest.py", str(ROOT / "tools" / "seed.example.jsonl"), "--out", str(out)]
            fake = {
                "id": "a", "title": "T", "artist": "A",
                "anchor_seconds": 12.5, "anchor_mode": "body",
                "detected_onset": 0.0, "detected_body_onset": 12.5,
                "ladder": [0.1, 0.5], "clips": {"100": "x.mp3"},
                "clip_warnings": [], "needs_review": False,
            }
            with mock.patch.object(sys, "argv", argv), \
                 mock.patch.object(ingest.shutil, "which", return_value="/usr/bin/x"), \
                 mock.patch.object(ingest, "process", return_value=fake):
                self.assertEqual(ingest.main(), 0)
            self.assertTrue((out / "catalogue.json").exists())
            written = json.loads((out / "catalogue.json").read_text(encoding="utf-8"))
            self.assertEqual(
                len(written),
                len(ingest.load_seeds(ROOT / "tools" / "seed.example.jsonl")),
            )

    def test_main_reports_missing_tools(self):
        argv = ["ingest.py", str(ROOT / "tools" / "seed.example.jsonl")]
        with mock.patch.object(sys, "argv", argv), \
             mock.patch.object(ingest.shutil, "which", return_value=None):
            self.assertEqual(ingest.main(), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
