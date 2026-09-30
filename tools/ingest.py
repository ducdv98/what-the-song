#!/usr/bin/env python3
"""
Build the clip library for a private guess-the-song game.

Run this on your own machine, not on the server. Two reasons:

  1. YouTube scores datacenter IPs far below residential ones, so a VPS or CI
     runner hits the "Sign in to confirm you're not a bot" wall constantly.
     Your laptop on a home connection, with browser cookies available, does not.
  2. The server then never talks to YouTube. It only ever holds short,
     metadata-stripped clips. Smaller, simpler, and a cleaner posture.

Note: downloading audio is contrary to YouTube's Terms of Service. This is a
private, non-commercial tool; keep the result private and don't redistribute
the audio.

Requires: yt-dlp, ffmpeg, ffprobe on PATH.

    pip install -U yt-dlp        # NOT youtube-dl, which is unmaintained
    ./tools/ingest.py seed.jsonl --out ./clips

Re-running is cheap: songs whose clips already exist are skipped, so you can
grow the seed file over time and just run it again.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import json
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

# Reveal ladder, in seconds. The player starts at 0.1s and buys more.
CLIP_LADDER = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0]


def clip_key(seconds: float) -> str:
    """
    Manifest key for a reveal rung, as integer milliseconds.

    Must not be str(seconds): Python renders 1.0 as "1.0" while JavaScript's
    String(1.0) is "1", so the client would miss every whole-second rung.
    Milliseconds are integers in both languages, so there is nothing to
    disagree about. lib/catalogue.ts clipKey() is the other half of this.
    """
    return str(round(seconds * 1000))

# Reject anything outside this — catches both Shorts and the hour-long
# "Tuyển tập nhạc trẻ" compilations that are everywhere on Vietnamese YouTube.
MIN_DURATION = 60
MAX_DURATION = 600

# Streaming-style loudness target. Uploads vary wildly in level, and a game
# where one clip is inaudible and the next is blaring is unplayable.
TARGET_LUFS = -14.0


@dataclass
class Seed:
    """
    One song. The canonical metadata is *yours*, not YouTube's.

    This is deliberate: YouTube titles are noise ("ARTIST | TITLE | Official
    MV", lyric-video reuploads, karaoke versions), so treating the video as an
    audio source and nothing else keeps catalogue quality under your control.
    """
    id: str
    title: str
    artist: str
    url: str
    aliases: list[str] = field(default_factory=list)
    genre: str | None = None
    # Seconds into the track to anchor clips. Set this by hand when the
    # automatic choice lands somewhere useless.
    start_at: float | None = None
    # "hook" (default): a deterministic point ~30-45% in. Crude but robust —
    #   past the intro on essentially every pop song, no detection required.
    # "body": loudness-step heuristic, aims at the vocal entry. Unvalidated
    #   against real music; see the docstring before relying on it.
    # "intro": just past leading silence. Keeps the song's real opening, which
    #   for most Vietnamese pop means a generic instrumental clue.
    anchor: str = "hook"
    # Per-song reveal ladder in seconds. None uses the run's ladder.
    ladder: list[float] | None = None


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    """
    Run a command, capturing output as UTF-8.

    encoding/errors are explicit because text=True decodes with the *locale*
    codec, which is cp1252 on a default Windows install. yt-dlp and ffmpeg
    happily print Vietnamese titles, so the default would raise
    UnicodeDecodeError on perfectly successful commands.
    """
    try:
        return subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
    except FileNotFoundError:
        # main() checks PATH up front, but a partial install (ffmpeg without
        # ffprobe is a common Windows one) should report, not traceback.
        return subprocess.CompletedProcess(
            cmd, returncode=127, stdout="", stderr=f"{cmd[0]}: not found on PATH"
        )


def probe_duration(path: Path) -> float:
    out = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(path),
    ])
    try:
        return float(out.stdout.strip())
    except ValueError:
        # ffprobe failed or printed nothing; 0.0 fails the duration sanity
        # check below, which reports the song rather than crashing the run.
        return 0.0


def detect_music_onset(path: Path, threshold_db: int = -35) -> float:
    """
    Find where real audio starts, so clips don't open on leading silence.

    Caveat worth knowing: this only detects *silence*. Vietnamese official MVs
    frequently open with dialogue or a cinematic skit, which is not silent and
    will not be caught here. Those need an explicit start_at in the seed file —
    the report at the end flags likely cases.
    """
    out = run([
        "ffmpeg", "-i", str(path),
        "-af", f"silencedetect=noise={threshold_db}dB:d=0.3",
        "-f", "null", "-",
    ])
    # If a silence run begins at the very start, music begins when it ends.
    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", out.stderr)]
    ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", out.stderr)]
    if starts and ends and starts[0] < 0.5:
        return ends[0]
    return 0.0


def detect_body_onset(
    path: Path,
    drop_db: float = 6.0,
    sustain: float = 1.0,
    max_fraction: float = 0.5,
) -> float:
    """
    Find where the song's full arrangement kicks in — a usable proxy for the
    vocal entry.

    Vietnamese pop, ballads and nhạc trẻ especially, routinely opens with 8 to
    30 seconds of generic instrumental: piano arpeggio, synth pad, strings. That
    material is interchangeable between songs, so a clue taken from it is
    unguessable however long it runs. The identifying moment is the vocal, and
    in pop production the vocal arriving comes with a step up in level.

    Method: measure the track's own mean volume, then treat anything more than
    `drop_db` below it as "not the body yet" and ask silencedetect where that
    stops. Using a threshold relative to the track is what makes this work
    across wildly different masters — a fixed dB threshold cannot.

    `sustain` stops a single cymbal or a spoken word in an MV intro triggering
    it. `max_fraction` rejects an implausibly late answer (a song that only gets
    loud in its final chorus), falling back rather than anchoring near the end.

    ⚠️ UNVALIDATED against real music. It was only ever exercised against
    synthetic tones, which are a poor model: real intros differ from choruses in
    arrangement and spectral density, not only in level. It is therefore NOT the
    default — "hook" is. Try it on your own catalogue, listen to the result, and
    use start_at for anything it gets wrong. For true vocal onset you need
    source separation; see docs/RESEARCH.md §10.7.
    """
    level = run(["ffmpeg", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"])
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", level.stderr)
    if not m:
        return 0.0
    try:
        threshold = float(m.group(1)) - drop_db
    except ValueError:
        return 0.0

    out = run([
        "ffmpeg", "-i", str(path),
        "-af", f"silencedetect=noise={threshold:.1f}dB:d={sustain}",
        "-f", "null", "-",
    ])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out.stderr)]

    # A leading stretch below the relative threshold is the intro; it ends where
    # the body begins. No leading stretch means the song starts at full level.
    if not (starts and ends and starts[0] < 0.5):
        return 0.0

    body = ends[0]
    duration = probe_duration(path)
    if duration > 0 and body > duration * max_fraction:
        return 0.0
    return body


def choose_anchor(
    seed: Seed,
    duration: float,
    onset: float,
    body_onset: float = 0.0,
) -> float:
    """Where the reveal ladder starts."""
    if seed.start_at is not None:
        return seed.start_at
    if seed.anchor == "hook":
        # A deterministic point between 30% and 45% in.
        #
        # This is the default because it is the only option that needs no
        # detection and no tuning. Vietnamese pop routinely opens with 8-30s of
        # generic instrumental — piano arpeggio, synth pad, strings — which is
        # interchangeable between songs and therefore unguessable however long
        # the clue runs. On a 4-minute track, 35% in is around 84s: verse two or
        # a chorus, i.e. past the intro and usually on or near the hook.
        #
        # Deterministic per song, so the anchor is stable across re-runs and
        # players cannot memorise a song by its first hi-hat.
        frac = 0.30 + (int(hashlib.sha256(seed.id.encode()).hexdigest(), 16) % 1000) / 1000 * 0.15
        return duration * frac
    if seed.anchor == "intro":
        # Just past leading silence. Keeps the song's actual opening, at the
        # cost of landing on generic instrumental for most Vietnamese pop.
        return onset
    # "body" (default): where the arrangement fills out, i.e. roughly the vocal
    # entry. Falls back to the silence trim when the detector finds nothing.
    return body_onset if body_onset > 0 else onset


def measure_loudness(path: Path) -> dict[str, str] | None:
    """Pass 1 of a two-pass EBU R128 normalisation."""
    out = run([
        "ffmpeg", "-i", str(path),
        "-af", f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-",
    ])
    m = re.search(r"\{[^{}]*\"input_i\"[\s\S]*?\}", out.stderr)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def normalise(src: Path, dst: Path) -> None:
    """Pass 2: apply the measured correction linearly."""
    stats = measure_loudness(src)
    if stats:
        f = (
            f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11:linear=true"
            f":measured_I={stats['input_i']}:measured_TP={stats['input_tp']}"
            f":measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}"
            f":offset={stats['target_offset']}"
        )
    else:
        # Single-pass fallback. Less accurate, still far better than nothing.
        f = f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11"
    run(["ffmpeg", "-y", "-i", str(src), "-af", f, "-ar", "44100", "-ac", "2", str(dst)])


def cut_clips(
    src: Path,
    anchor: float,
    out_dir: Path,
    salt: str,
    ladder: list[float] | None = None,
) -> tuple[dict[str, str], list[str]]:
    """
    Cut the reveal ladder into opaque, metadata-free files.

    Filenames are hashes: a player who opens devtools must not be handed the
    answer in a URL. `-map_metadata -1` drops ID3 tags for the same reason.

    Each cut is verified rather than assumed. `-ss` before `-i` would seek to a
    keyframe on a compressed input, but the input here is always PCM WAV (from
    yt-dlp, then from normalise), where seeking is sample-exact — measured at
    0.000s deviation across the whole ladder. The check stays because the cost
    is one ffprobe call and a wrong clip length silently changes difficulty:
    if the input format ever changes, this is what will catch it.

    Returns (manifest, warnings).
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}
    warnings: list[str] = []

    for seconds in (ladder or CLIP_LADDER):
        name = hashlib.sha256(f"{salt}:{seconds}".encode()).hexdigest()[:24] + ".m4a"
        dest = out_dir / name
        run([
            "ffmpeg", "-y",
            "-ss", f"{anchor:.3f}", "-t", f"{seconds:.3f}",
            "-i", str(src),
            "-map_metadata", "-1", "-map_chapters", "-1",
            "-c:a", "aac", "-b:a", "128k",
            str(dest),
        ])

        if not dest.exists() or dest.stat().st_size == 0:
            warnings.append(f"{seconds}s clip was not produced")
            continue

        actual = probe_duration(dest)
        # Generous on short rungs: AAC frames are ~23ms, so a 0.1s target
        # cannot be sample-exact in a container.
        tolerance = max(0.06, seconds * 0.25)
        if abs(actual - seconds) > tolerance:
            warnings.append(
                f"{seconds}s clip measured {actual:.3f}s "
                f"(off by {actual - seconds:+.3f}s)"
            )

        manifest[clip_key(seconds)] = name

    return manifest, warnings


def detect_os() -> str:
    """'windows' | 'macos' | 'linux'."""
    if sys.platform.startswith("win"):
        return "windows"
    if sys.platform == "darwin":
        return "macos"
    return "linux"


# Where each browser keeps its profile, per OS. Presence of the directory is a
# good enough proxy for "this browser is installed and has been run".
_BROWSER_PROFILES: dict[str, dict[str, list[str]]] = {
    "windows": {
        "firefox": ["APPDATA/Mozilla/Firefox/Profiles"],
        "chrome": ["LOCALAPPDATA/Google/Chrome/User Data"],
        "edge": ["LOCALAPPDATA/Microsoft/Edge/User Data"],
    },
    "macos": {
        "firefox": ["~/Library/Application Support/Firefox/Profiles"],
        "chrome": ["~/Library/Application Support/Google/Chrome"],
        "brave": ["~/Library/Application Support/BraveSoftware/Brave-Browser"],
    },
    "linux": {
        "firefox": ["~/.mozilla/firefox", "~/snap/firefox/common/.mozilla/firefox"],
        "chrome": ["~/.config/google-chrome", "~/.config/chromium"],
        "brave": ["~/.config/BraveSoftware/Brave-Browser"],
    },
}


def _profile_exists(spec: str) -> bool:
    """Resolve a profile path spec, which may lead with a Windows env var."""
    if spec.startswith("~"):
        return Path(spec).expanduser().is_dir()
    var, _, rest = spec.partition("/")
    root = os.environ.get(var)
    return bool(root) and (Path(root) / rest).is_dir()


def installed_browsers(host_os: str) -> list[str]:
    return [
        name
        for name, specs in _BROWSER_PROFILES.get(host_os, {}).items()
        if any(_profile_exists(spec) for spec in specs)
    ]


def auto_cookie_browser(host_os: str) -> tuple[str | None, str]:
    """
    Pick a browser yt-dlp can actually read cookies from. Returns
    (browser or None, explanation to print).

    Firefox is preferred everywhere: it stores cookies in plain SQLite, so no
    platform gets in the way.

    On Windows, Chromium browsers are not merely awkward but impossible —
    Chrome 127+ encrypts cookies with app-bound encryption that ties the key to
    the Chrome process. No external tool can read them and there is no local
    workaround. Edge, Brave, Opera and Vivaldi all inherit it. So on Windows we
    only ever offer Firefox.
    """
    found = installed_browsers(host_os)

    if "firefox" in found:
        return "firefox", "cookies: using Firefox"

    if host_os == "windows":
        blocked = [b for b in found if b != "firefox"]
        detail = f" Found {', '.join(blocked)}, but" if blocked else ""
        return None, (
            f"cookies: none available.{detail} Chrome 127+ on Windows encrypts"
            " cookies with app-bound encryption that no external tool can read."
            "\ncookies: install Firefox and sign in to YouTube, or export a"
            " cookies.txt and pass --cookies FILE."
            "\ncookies: if downloads succeed anyway, you do not need any of this."
        )

    for candidate in ("chrome", "brave"):
        if candidate in found:
            return candidate, f"cookies: using {candidate.title()}"

    return None, "cookies: no supported browser profile found; continuing without"


def install_hint(host_os: str) -> list[str]:
    if host_os == "windows":
        return [
            "  py -m pip install -U yt-dlp",
            "  winget install ffmpeg      (or: scoop install ffmpeg)",
            "  then reopen your terminal so PATH is picked up.",
        ]
    if host_os == "macos":
        return ["  pip install -U yt-dlp", "  brew install ffmpeg"]
    return [
        "  pip install -U yt-dlp",
        "  sudo apt install ffmpeg      (or your distro's equivalent)",
    ]


def cookie_args(browser: str | None, cookie_file: Path | None) -> list[str]:
    """Build yt-dlp's cookie flags."""
    if cookie_file:
        return ["--cookies", str(cookie_file)]
    if browser:
        return ["--cookies-from-browser", browser]
    return []


def download_audio(
    url: str,
    work: Path,
    browser: str | None = None,
    cookie_file: Path | None = None,
) -> Path | None:
    """
    Fetch bestaudio as wav for processing.

    Getting past the bot wall is an arms race, not a fixed solution: expect to
    bump yt-dlp every few weeks. If this starts failing across the board,
    update yt-dlp before debugging anything else.
    """
    target = work / "audio.wav"
    base = [
        "yt-dlp", "-f", "bestaudio",
        "-x", "--audio-format", "wav",
        "--no-playlist",
        "-o", str(work / "audio.%(ext)s"),
    ]
    cookies = cookie_args(browser, cookie_file)

    res = run([*base, *cookies, url])
    if not target.exists() and cookies:
        # Retry bare — from a residential IP this often succeeds anyway, and it
        # rules out a cookie problem as the cause.
        print("    retrying without cookies…", file=sys.stderr)
        res = run([*base, url])

    if not target.exists():
        tail = res.stderr.strip().splitlines()[-2:] or ["(no output)"]
        for line in tail:
            print(f"    {line}", file=sys.stderr)
        if "not a bot" in res.stderr or "Sign in to confirm" in res.stderr:
            print(
                "    → bot check. Pass --cookies-from-browser firefox, or"
                " --cookies cookies.txt.",
                file=sys.stderr,
            )
        return None
    return target


def process(
    seed: Seed,
    out_root: Path,
    browser: str | None = None,
    cookie_file: Path | None = None,
    ladder: list[float] | None = None,
) -> dict | None:
    # --out IS the clips root, so no extra "clips" segment here: the layout
    # must be <out>/catalogue.json alongside <out>/<id>/<hash>.m4a, because the
    # app requests /clips/catalogue.json and /clips/<id>/<hash>.m4a from the
    # same base. An extra level here 404s every clip while the catalogue loads
    # fine, which looks like a serving problem rather than a path one.
    clip_dir = out_root / seed.id
    if (clip_dir / "done.json").exists():
        print(f"  [skip] {seed.id} already built")
        return json.loads((clip_dir / "done.json").read_text(encoding="utf-8"))

    print(f"  [get ] {seed.artist} — {seed.title}")
    # ignore_cleanup_errors: on Windows a lingering ffmpeg handle can block
    # the temp dir removal, which must not fail the whole run.
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        work = Path(tmp)
        raw = download_audio(seed.url, work, browser, cookie_file)
        if raw is None:
            return None

        duration = probe_duration(raw)
        if not (MIN_DURATION <= duration <= MAX_DURATION):
            print(f"    rejected: {duration:.0f}s is outside "
                  f"{MIN_DURATION}-{MAX_DURATION}s (compilation or Short?)", file=sys.stderr)
            return None

        onset = detect_music_onset(raw)
        # Only the "body" mode uses this, and it is an extra ffmpeg pass.
        body_onset = detect_body_onset(raw) if seed.anchor == "body" else 0.0
        anchor = choose_anchor(seed, duration, onset, body_onset)

        levelled = work / "levelled.wav"
        normalise(raw, levelled)
        if not levelled.exists():
            levelled = raw

        rungs = seed.ladder or ladder or CLIP_LADDER
        manifest, clip_warnings = cut_clips(
            levelled, anchor, clip_dir, salt=seed.id, ladder=rungs
        )

    if not manifest:
        print("    rejected: ffmpeg produced no clips", file=sys.stderr)
        return None

    record = {
        "id": seed.id,
        "title": seed.title,
        "artist": seed.artist,
        "aliases": seed.aliases,
        "genre": seed.genre,
        "anchor_seconds": round(anchor, 3),
        "anchor_mode": seed.anchor,
        "detected_onset": round(onset, 3),
        "detected_body_onset": round(body_onset, 3),
        "ladder": rungs,
        "source_duration": round(duration, 1),
        "clips": manifest,
        "clip_warnings": clip_warnings,
        # Flag anything where the anchor choice was unusual enough to deserve
        # an ear: a very long intro, or a detector that found nothing and fell
        # back to the silence trim.
        "needs_review": (
            seed.start_at is None
            and (
                # The heuristic found nothing and silently fell back.
                (seed.anchor == "body" and body_onset <= 0)
                # A long intro means an "intro" clue is probably generic.
                or (seed.anchor == "intro" and onset > 4.0)
            )
        ),
    }
    (clip_dir / "done.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return record


def load_seeds(path: Path) -> list[Seed]:
    seeds = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        try:
            seeds.append(Seed(**json.loads(line)))
        except (json.JSONDecodeError, TypeError) as e:
            print(f"seed line {n}: {e}", file=sys.stderr)
    return seeds


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("seed", type=Path, help="JSONL seed file")
    ap.add_argument("--out", type=Path, default=Path("./clips"))
    ap.add_argument(
        "--cookies-from-browser",
        dest="browser",
        metavar="BROWSER",
        help="Override the auto-detected browser (e.g. firefox). On Windows,"
        " Chromium browsers cannot be read at all — use firefox or --cookies.",
    )
    ap.add_argument(
        "--ladder",
        metavar="SECONDS",
        help="Comma-separated reveal ladder, e.g. 0.5,1,2,4,8,16,30. Default"
        f" {','.join(str(x) for x in CLIP_LADDER)}. A song can override it with"
        ' its own "ladder" field.',
    )
    ap.add_argument(
        "--no-cookies",
        action="store_true",
        help="Skip cookies entirely. Often fine from a home connection.",
    )
    ap.add_argument(
        "--cookies",
        dest="cookie_file",
        type=Path,
        metavar="FILE",
        help="Netscape cookies.txt, exported from your browser.",
    )
    args = ap.parse_args()

    if args.cookie_file and not args.cookie_file.exists():
        print(f"cookie file not found: {args.cookie_file}", file=sys.stderr)
        return 1

    ladder: list[float] | None = None
    if args.ladder:
        try:
            ladder = sorted({float(x) for x in args.ladder.split(",") if x.strip()})
        except ValueError:
            print(f"could not parse --ladder: {args.ladder}", file=sys.stderr)
            return 1
        if not ladder or ladder[0] <= 0:
            print("--ladder needs at least one positive duration", file=sys.stderr)
            return 1

    host_os = detect_os()

    missing = [t for t in ("yt-dlp", "ffmpeg", "ffprobe") if shutil.which(t) is None]
    if missing:
        print(f"missing required tool(s): {', '.join(missing)}", file=sys.stderr)
        for line in install_hint(host_os):
            print(line, file=sys.stderr)
        return 1

    # Resolve the cookie source: explicit flags win, otherwise detect one.
    browser = args.browser
    if args.no_cookies or args.cookie_file:
        browser = None
    elif browser is None:
        browser, note = auto_cookie_browser(host_os)
        print(note)
    if args.cookie_file:
        print(f"cookies: using {args.cookie_file}")

    seeds = load_seeds(args.seed)
    print(f"{len(seeds)} songs in seed file")

    built, failed, review = [], [], []
    for seed in seeds:
        rec = process(seed, args.out, browser, args.cookie_file, ladder)
        if rec is None:
            failed.append(seed)
        else:
            built.append(rec)
            if rec.get("needs_review"):
                review.append(rec)

    # cut_clips creates per-song dirs as a side effect, but if every song
    # failed nothing has made --out yet and the write below would crash —
    # losing the failure report, which is the one useful thing left.
    args.out.mkdir(parents=True, exist_ok=True)

    catalogue = args.out / "catalogue.json"
    catalogue.write_text(
        json.dumps(built, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\nbuilt {len(built)}, failed {len(failed)}")
    print(f"catalogue: {catalogue}")
    if failed:
        print("\nfailed:")
        for s in failed:
            print(f"  - {s.artist} — {s.title}  ({s.url})")
    if built:
        print("\nanchors (where each clue starts):")
        for r in built:
            flag = "  <-- check" if r.get("needs_review") else ""
            # .get throughout: this summary is the last thing to run, so a
            # record missing a field must not cost the whole report.
            dur = r.get("source_duration") or 0
            pct = f"{r.get('anchor_seconds', 0) / dur * 100:4.0f}%" if dur else "   ?"
            print(f"  {r.get('anchor_seconds', 0):>7.2f}s ({pct} in)  "
                  f"[{r.get('anchor_mode', '?')}]  "
                  f"{r.get('artist', '?')} — {r.get('title', '?')}{flag}")

    if review:
        print("\nthese anchors look questionable — have a listen, and set"
              "\n\"start_at\" in the seed file if the clue is not identifiable:")
        for r in review:
            print(f"  - {r.get('artist', '?')} — {r.get('title', '?')}  "
                  f"anchor={r.get('anchor_seconds')}s "
                  f"body={r.get('detected_body_onset')}s")

    # Clip length problems are a pipeline fault, not a catalogue one: they mean
    # ffmpeg is not cutting what was asked for.
    flagged = [r for r in built if r.get("clip_warnings")]
    if flagged:
        print("\nclip length problems — the ffmpeg cut did not match the ladder:")
        for r in flagged:
            print(f"  - {r['artist']} — {r['title']}")
            for w in r["clip_warnings"]:
                print(f"      {w}")
        print("  The input should be PCM WAV, where -ss is exact. If clips are")
        print("  off, check that normalise() produced a .wav and not something")
        print("  compressed, where -ss before -i would snap to a keyframe.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
