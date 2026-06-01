#!/usr/bin/env python3
"""
Generate demo voiceover MP3s with Microsoft Edge TTS (free, no API key).

Usage:
  python scripts/demo-video/generate-voiceover.py
  python scripts/demo-video/generate-voiceover.py --locale vi
  python scripts/demo-video/generate-voiceover.py --locale en --locale vi

Output: docs/demo-video-output/<locale>/
  - 01-title.mp3 … 10-cta.mp3
  - full-voiceover.mp3 (concat if ffmpeg available)
  - manifest.json (durations + edit timeline)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Install: pip install edge-tts", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).resolve().parent / "voiceover.json"
OUT_ROOT = ROOT / "docs" / "demo-video-output"


def find_ffmpeg() -> str | None:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    # common Windows installs
    for candidate in [
        Path("/c/ffmpeg/bin/ffmpeg.exe"),
        Path.home() / "scoop" / "shims" / "ffmpeg.exe",
        Path("C:/ProgramData/chocolatey/bin/ffmpeg.exe"),
    ]:
        if candidate.exists():
            return str(candidate)
    return None


def probe_duration_sec(ffmpeg: str, path: Path) -> float:
    cmd = [
        ffmpeg,
        "-i",
        str(path),
        "-f",
        "null",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    # Duration: 00:00:14.52, in stderr
    for line in proc.stderr.splitlines():
        if "Duration:" in line:
            ts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = ts.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


def concat_mp3(ffmpeg: str, files: list[Path], out: Path) -> None:
    list_file = out.parent / "concat-list.txt"
    lines = [f"file '{f.resolve().as_posix()}'" for f in files]
    list_file.write_text("\n".join(lines), encoding="utf-8")
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(out),
        ],
        check=True,
        capture_output=True,
    )
    list_file.unlink(missing_ok=True)


async def synthesize(text: str, voice: str, rate: str, out: Path) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(out))


async def run_locale(locale: str, cfg: dict) -> dict:
    loc = cfg["locales"][locale]
    voice = loc["voice"]
    rate = loc.get("rate", "+0%")
    out_dir = OUT_ROOT / locale
    out_dir.mkdir(parents=True, exist_ok=True)

    ffmpeg = find_ffmpeg()
    segments_out: list[dict] = []
    mp3_files: list[Path] = []
    timeline_start = 0.0

    print(f"\n-- {loc['label']} ({voice}) --")

    for seg in cfg["segments"]:
        text = seg[locale]
        seg_id = seg["id"]
        out_path = out_dir / f"{seg_id}.mp3"
        print(f"  TTS {seg_id}...")
        await synthesize(text, voice, rate, out_path)
        mp3_files.append(out_path)

        duration = probe_duration_sec(ffmpeg, out_path) if ffmpeg else seg["durationTargetSec"]
        entry = {
            "id": seg_id,
            "slide": seg["slide"],
            "file": out_path.name,
            "durationSec": round(duration, 2),
            "timelineStartSec": round(timeline_start, 2),
            "timelineEndSec": round(timeline_start + duration, 2),
            "targetSec": seg["durationTargetSec"],
            "broll": seg.get("broll"),
            "brollTrim": seg.get("brollTrim"),
            "text": text,
        }
        segments_out.append(entry)
        timeline_start += duration

    full_path = out_dir / "full-voiceover.mp3"
    if ffmpeg and mp3_files:
        print("  Concat -> full-voiceover.mp3")
        concat_mp3(ffmpeg, mp3_files, full_path)
        total = probe_duration_sec(ffmpeg, full_path)
    else:
        total = timeline_start
        print("  (ffmpeg not found — skip full concat; install ffmpeg for single MP3)")

    manifest = {
        "locale": locale,
        "voice": voice,
        "totalDurationSec": round(total, 2),
        "targetRuntimeSec": cfg["targetRuntimeSec"],
        "segments": segments_out,
        "brollLibrary": cfg.get("brollLibrary", []),
    }
    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    # CapCut / DaVinci friendly SRT
    srt_path = out_dir / "subtitles.srt"
    srt_lines: list[str] = []
    for i, s in enumerate(segments_out, 1):
        start = s["timelineStartSec"]
        end = s["timelineEndSec"]
        srt_lines.append(str(i))
        srt_lines.append(f"{fmt_srt(start)} --> {fmt_srt(end)}")
        srt_lines.append(s["text"])
        srt_lines.append("")
    srt_path.write_text("\n".join(srt_lines), encoding="utf-8")

    print(f"  Done: {out_dir.relative_to(ROOT)} ({total:.1f}s total)")
    return manifest


def fmt_srt(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MemWal++ demo voiceover")
    parser.add_argument(
        "--locale",
        action="append",
        choices=["en", "vi"],
        help="Locale(s) to generate (default: en)",
    )
    args = parser.parse_args()
    locales = args.locale or ["en"]

    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    if not find_ffmpeg():
        print(
            "Note: ffmpeg not in PATH. Per-slide MP3s still work.\n"
            "  Install: winget install Gyan.FFmpeg  OR  choco install ffmpeg\n",
            file=sys.stderr,
        )

    for loc in locales:
        await run_locale(loc, cfg)

    print(f"\nOutput folder: {OUT_ROOT.relative_to(ROOT)}/")
    print("Next: see scripts/demo-video/README.md for CapCut / OBS assembly.")


if __name__ == "__main__":
    asyncio.run(main())
