#!/usr/bin/env python3
"""Fetch a YouTube video's storyboard stills (the low-res frames behind the scrub bar) to study its visual craft.

    uv run scripts/storyboard.py <video-id-or-url> --out <scratchpad>/storyboards [--quad]

Claude can't watch video; these stills show composition, color and density every few seconds (not pacing or motion).
Each sheet is a grid of frames in time order; --quad also tiles 4 sheets into one overview image for quicker reading.
The stills are the authors' work: keep them in the scratchpad, never commit them. Write what you learn in
references/craft/README.md from actually looking at them.
"""

import argparse
import re
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def video_id(s: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", s)
    return m.group(1) if m else s


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--quad", action="store_true", help="also tile every 4 sheets into one overview image")
    a = ap.parse_args()
    vid = video_id(a.video)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(f"https://www.youtube.com/watch?v={vid}", headers={"User-Agent": UA, "Accept-Language": "en-US"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    m = re.search(r'"playerStoryboardSpecRenderer":\{"spec":"([^"]+)"', html)
    if not m:
        raise SystemExit("no storyboard spec found (age-gated, private, or the page format changed)")
    base, *levels = m.group(1).replace("\\u0026", "&").split("|")
    level = len(levels) - 1                                   # the highest resolution
    w, h, count, cols, rows, interval, name, sigh = levels[level].split("#")
    per_sheet = int(cols) * int(rows)
    sheets = []
    for n in range(-(-int(count) // per_sheet)):
        url = base.replace("$L", str(level)).replace("$N", name.replace("$M", str(n))) + "&sigh=" + sigh
        f = out / f"{vid}_sb{n:02d}.jpg"
        urllib.request.urlretrieve(url, f)
        sheets.append(f)
    print(f"{len(sheets)} sheets of {cols}×{rows} frames ({w}×{h} each, every ~{int(interval) / 1000:g}s) → {out}")
    if a.quad:
        from PIL import Image
        for q in range(0, len(sheets), 4):
            ims = [Image.open(f) for f in sheets[q:q + 4]]
            W, H = ims[0].size
            canvas = Image.new("RGB", (W * 2, H * 2), "black")
            for i, im in enumerate(ims):
                canvas.paste(im, ((i % 2) * W, (i // 2) * H))
            canvas.save(out / f"{vid}_quad{q // 4:02d}.jpg")
        print(f"{-(-len(sheets) // 4)} overview images ({vid}_quadNN.jpg)")


if __name__ == "__main__":
    main()
