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
            "detect_music_onset", "CLIP_LADDER", "_BROWSER_PROFILES",
        ):
            self.assertTrue(hasattr(ingest, name), f"missing: {name}")

    def test_ladder_matches_the_client(self):
        # lib/audio/engine.ts REVEAL_LADDER must agree or clip lookups 404.
        self.assertEqual(ingest.CLIP_LADDER, [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0])

    def test_clip_keys_match_javascript(self):
        # str(1.0) is "1.0" in Python but String(1.0) is "1" in JS, which
        # silently broke every rung from 1s up. Milliseconds are integers in
        # both. The mirror of this lives in lib/catalogue.test.ts.
        self.assertEqual(
            [ingest.clip_key(s) for s in ingest.CLIP_LADDER],
            ["100", "500", "1000", "2000", "4000", "8000", "16000"],
        )


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
        seeds = ingest.load_seeds(ROOT / "tools" / "seed.example.jsonl")
        self.assertEqual(len(seeds), 3)
        self.assertEqual(seeds[0].title, "Nơi Này Có Anh")

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

    def test_intro_uses_detected_onset(self):
        self.assertEqual(ingest.choose_anchor(self._seed(), 240.0, 3.2), 3.2)

    def test_hook_is_deterministic_and_mid_track(self):
        seed = self._seed(anchor="hook")
        a = ingest.choose_anchor(seed, 240.0, 0.0)
        self.assertEqual(a, ingest.choose_anchor(seed, 240.0, 0.0))
        self.assertGreaterEqual(a, 240.0 * 0.25)
        self.assertLessEqual(a, 240.0 * 0.60)


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
                     side_effect=lambda src, anchor, out_dir, salt: (
                         out_dir.mkdir(parents=True, exist_ok=True),
                         ({"100": "deadbeef.m4a"}, []),
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
            fake = {"id": "a", "title": "T", "artist": "A", "clips": {}, "clip_warnings": []}
            with mock.patch.object(sys, "argv", argv), \
                 mock.patch.object(ingest.shutil, "which", return_value="/usr/bin/x"), \
                 mock.patch.object(ingest, "process", return_value=fake):
                self.assertEqual(ingest.main(), 0)
            self.assertTrue((out / "catalogue.json").exists())
            written = json.loads((out / "catalogue.json").read_text(encoding="utf-8"))
            self.assertEqual(len(written), 3)

    def test_main_reports_missing_tools(self):
        argv = ["ingest.py", str(ROOT / "tools" / "seed.example.jsonl")]
        with mock.patch.object(sys, "argv", argv), \
             mock.patch.object(ingest.shutil, "which", return_value=None):
            self.assertEqual(ingest.main(), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
