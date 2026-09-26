#!/usr/bin/env python3
"""Tile frames from a video into one labeled image, so a render can be reviewed as a still.

    uv run scripts/contact_sheet.py build/video/Intro.mp4                 # 12 evenly spaced frames
    uv run scripts/contact_sheet.py Intro.mp4 -n 20 --cols 5
    uv run scripts/contact_sheet.py Intro.mp4 -t 1.5,3,7.25 --width 960  # exact timestamps (s)
    uv run scripts/contact_sheet.py Intro.mp4 --burst 4.0 --fps 8        # 1s of motion around t=4
    uv run scripts/contact_sheet.py build/shots/step-02-f*.png -o sheet.png  # tile still images (e.g. shoot.mjs --frames)

Writes <video>.sheet.png next to the video unless -o is given. Uses the ffmpeg bundled with
imageio-ffmpeg, so no system ffmpeg is needed.
"""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def duration_of(video: Path) -> float:
    _, secs = imageio_ffmpeg.count_frames_and_secs(str(video))
    return secs


def grab(video: Path, t: float, width: int, dest: Path) -> Image.Image:
    subprocess.run([FFMPEG, "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1",
                    "-vf", f"scale={width}:-2", "-y", str(dest)], check=True)
    return Image.open(dest).convert("RGB")


def label_font(size: int):
    for name in ("Inter-Regular.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def tile(frames: list[Image.Image], labels: list[str], cols: int) -> Image.Image:
    w, h = max(f.width for f in frames), max(f.height for f in frames)
    pad, bar = 6, 22
    cols = min(cols, len(frames))
    rows = -(-len(frames) // cols)
    sheet = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + bar + pad) + pad), (40, 40, 40))
    draw, font = ImageDraw.Draw(sheet), label_font(14)
    for i, (img, label) in enumerate(zip(frames, labels)):
        x, y = pad + (i % cols) * (w + pad), pad + (i // cols) * (h + bar + pad)
        sheet.paste(img, (x, y + bar))
        draw.text((x + 4, y + 3), label, fill=(230, 230, 230), font=font)
    return sheet


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", type=Path, nargs="+", help="one video, or several images to tile as they are")
    ap.add_argument("-n", type=int, default=12, help="number of evenly spaced frames")
    ap.add_argument("-t", help="comma-separated timestamps in seconds")
    ap.add_argument("--burst", type=float, help="center time for a short motion burst")
    ap.add_argument("--span", type=float, default=1.0, help="burst length in seconds")
    ap.add_argument("--fps", type=float, default=6, help="burst sampling rate")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--width", type=int, default=480, help="width of each tile in px")
    ap.add_argument("-o", "--out", type=Path)
    a = ap.parse_args()

    if all(p.suffix.lower() in IMAGE_SUFFIXES for p in a.inputs):
        frames = [Image.open(p).convert("RGB") for p in a.inputs]
        frames = [f.resize((a.width, round(f.height * a.width / f.width))) for f in frames]
        out = a.out or a.inputs[0].with_name("frames.sheet.png")
        tile(frames, [p.stem for p in a.inputs], a.cols).save(out)
        print(f"{out}  ({len(frames)} images)")
        return
    a.video = a.inputs[0]
    dur = duration_of(a.video)
    if a.t:
        times = [float(x) for x in a.t.split(",")]
    elif a.burst is not None:
        k = max(2, round(a.span * a.fps))
        t0 = max(0.0, a.burst - a.span / 2)
        times = [t0 + i * a.span / (k - 1) for i in range(k)]
    else:
        times = [dur * (i + 0.5) / a.n for i in range(a.n)]
    times = [min(max(0.0, t), max(0.0, dur - 0.05)) for t in times]

    with tempfile.TemporaryDirectory() as tmp:
        frames = [grab(a.video, t, a.width, Path(tmp) / f"{i}.png") for i, t in enumerate(times)]

    out = a.out or a.video.with_suffix(".sheet.png")
    tile(frames, [f"#{i}  t={t:.2f}s" for i, t in enumerate(times)], a.cols).save(out)
    print(f"{out}  ({len(frames)} frames of {dur:.1f}s video)")


if __name__ == "__main__":
    main()
