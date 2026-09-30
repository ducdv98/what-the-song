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
    # "intro": just after the music starts. "hook": deterministic mid-track.
    anchor: str = "intro"


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def probe_duration(path: Path) -> float:
    out = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(path),
    ])
    return float(out.stdout.strip())


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


def choose_anchor(seed: Seed, duration: float, onset: float) -> float:
    """Where the reveal ladder starts."""
    if seed.start_at is not None:
        return seed.start_at
    if seed.anchor == "hook":
        # Deterministic point in the middle third: dodges intros entirely and
        # stops players memorising songs by their first hi-hat. Harder, though
        # — a 0.1s clip from mid-song is a real step up in difficulty.
        frac = 0.25 + (int(hashlib.sha256(seed.id.encode()).hexdigest(), 16) % 1000) / 1000 * 0.35
        return duration * frac
    return onset


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


def cut_clips(src: Path, anchor: float, out_dir: Path, salt: str) -> dict[str, str]:
    """
    Cut the reveal ladder into opaque, metadata-free files.

    Filenames are hashes: a player who opens devtools must not be handed the
    answer in a URL. `-map_metadata -1` drops ID3 tags for the same reason.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}
    for seconds in CLIP_LADDER:
        name = hashlib.sha256(f"{salt}:{seconds}".encode()).hexdigest()[:24] + ".m4a"
        run([
            "ffmpeg", "-y",
            "-ss", f"{anchor:.3f}", "-t", f"{seconds:.3f}",
            "-i", str(src),
            "-map_metadata", "-1", "-map_chapters", "-1",
            "-c:a", "aac", "-b:a", "128k",
            str(out_dir / name),
        ])
        manifest[str(seconds)] = name
    return manifest


def download_audio(url: str, work: Path) -> Path | None:
    """
    Fetch bestaudio as wav for processing.

    --cookies-from-browser is what gets you past the bot wall most of the time.
    It is an arms race, not a fixed solution: expect to bump yt-dlp every few
    weeks. If this starts failing across the board, update yt-dlp first.
    """
    target = work / "audio.wav"
    cmd = [
        "yt-dlp", "-f", "bestaudio",
        "-x", "--audio-format", "wav",
        "--no-playlist",
        "--cookies-from-browser", "chrome",
        "-o", str(work / "audio.%(ext)s"),
        url,
    ]
    res = run(cmd)
    if not target.exists():
        # Retry without cookies — works fine from a residential IP often enough.
        res = run([c for c in cmd if c not in ("--cookies-from-browser", "chrome")])
    if not target.exists():
        print(f"    download failed: {res.stderr.strip().splitlines()[-1:]}", file=sys.stderr)
        return None
    return target


def process(seed: Seed, out_root: Path) -> dict | None:
    clip_dir = out_root / "clips" / seed.id
    if (clip_dir / "done.json").exists():
        print(f"  [skip] {seed.id} already built")
        return json.loads((clip_dir / "done.json").read_text())

    print(f"  [get ] {seed.artist} — {seed.title}")
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        raw = download_audio(seed.url, work)
        if raw is None:
            return None

        duration = probe_duration(raw)
        if not (MIN_DURATION <= duration <= MAX_DURATION):
            print(f"    rejected: {duration:.0f}s is outside "
                  f"{MIN_DURATION}-{MAX_DURATION}s (compilation or Short?)", file=sys.stderr)
            return None

        onset = detect_music_onset(raw)
        anchor = choose_anchor(seed, duration, onset)

        levelled = work / "levelled.wav"
        normalise(raw, levelled)
        if not levelled.exists():
            levelled = raw

        manifest = cut_clips(levelled, anchor, clip_dir, salt=seed.id)

    record = {
        "id": seed.id,
        "title": seed.title,
        "artist": seed.artist,
        "aliases": seed.aliases,
        "genre": seed.genre,
        "anchor_seconds": round(anchor, 3),
        "detected_onset": round(onset, 3),
        "source_duration": round(duration, 1),
        "clips": manifest,
        # Long detected onset usually means a spoken or cinematic intro that
        # silencedetect could not see past. Worth an ear before you trust it.
        "needs_review": onset > 8.0 or (seed.start_at is None and seed.anchor == "intro" and onset > 4.0),
    }
    (clip_dir / "done.json").write_text(json.dumps(record, ensure_ascii=False, indent=2))
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
    args = ap.parse_args()

    for tool in ("yt-dlp", "ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            print(f"missing required tool: {tool}", file=sys.stderr)
            return 1

    seeds = load_seeds(args.seed)
    print(f"{len(seeds)} songs in seed file")

    built, failed, review = [], [], []
    for seed in seeds:
        rec = process(seed, args.out)
        if rec is None:
            failed.append(seed)
        else:
            built.append(rec)
            if rec.get("needs_review"):
                review.append(rec)

    catalogue = args.out / "catalogue.json"
    catalogue.write_text(json.dumps(built, ensure_ascii=False, indent=2))

    print(f"\nbuilt {len(built)}, failed {len(failed)}")
    print(f"catalogue: {catalogue}")
    if failed:
        print("\nfailed:")
        for s in failed:
            print(f"  - {s.artist} — {s.title}  ({s.url})")
    if review:
        print("\nlisten to these; the clip may start on dialogue or an intro."
              "\nset \"start_at\" in the seed file to fix:")
        for r in review:
            print(f"  - {r['artist']} — {r['title']}  onset={r['detected_onset']}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
