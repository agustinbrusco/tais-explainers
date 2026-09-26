#!/usr/bin/env python3
"""Render narration segments to WAV with Kokoro (local, CPU, Apache-2.0).

    uv run scripts/tts.py projects/<slug>/narration.yaml            # render changed segments
    uv run scripts/tts.py projects/<slug>/narration.yaml --preview  # + one concatenated WAV to listen to
    uv run scripts/tts.py projects/<slug>/narration.yaml --only intro,hook --force
    uv run scripts/tts.py --say "Quick test of a sentence." -o /tmp/x.wav [--voice am_michael]
    uv run scripts/tts.py --voices

narration.yaml:
    voice: am_michael      # see --voices; en: a*/b*, es: ef_dora, em_alex
    lang: en-us            # en-us | en-gb | es
    speed: 1.0
    segments:
      - id: hook
        text: >
          Suppose you could read a language model's mind...

Outputs <project>/build/audio/<id>.wav and manifest.json. A segment is skipped when its
spoken text, voice and speed are unchanged. kit/lexicon.yaml rewrites jargon into speakable
forms before synthesis; captions keep the original text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / ".cache/models/kokoro-v1.0.onnx"
VOICES = ROOT / ".cache/models/voices-v1.0.bin"
LEXICON = ROOT / "kit/lexicon.yaml"
PREVIEW_GAP_S = 0.5


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p)


def load_kokoro():
    if not MODEL.exists() or not VOICES.exists():
        sys.exit(f"Kokoro model missing in {MODEL.parent}. Run: ./scripts/setup.sh")
    from kokoro_onnx import Kokoro

    return Kokoro(str(MODEL), str(VOICES))


def load_lexicon(lang: str) -> dict[str, str]:
    if not LEXICON.exists():
        return {}
    data = yaml.safe_load(LEXICON.read_text()) or {}
    return {**(data.get("all") or {}), **(data.get(lang.split("-")[0]) or {})}


def speakable(text: str, lexicon: dict[str, str]) -> str:
    text = " ".join(text.split())
    for written, spoken in sorted(lexicon.items(), key=lambda kv: -len(kv[0])):
        text = re.sub(rf"(?<!\w){re.escape(written)}(?!\w)", spoken, text)
    return text


def synth(kokoro, text: str, voice: str, speed: float, lang: str) -> tuple[np.ndarray, int]:
    return kokoro.create(text, voice=voice, speed=speed, lang=lang)


def render_project(path: Path, only: set[str] | None, force: bool, preview: bool) -> None:
    spec = yaml.safe_load(path.read_text())
    voice, lang, speed = spec.get("voice", "am_michael"), spec.get("lang", "en-us"), float(spec.get("speed", 1.0))
    lexicon = load_lexicon(lang)
    out_dir = path.parent / "build/audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    old = json.loads(manifest_path.read_text())["segments"] if manifest_path.exists() else {}

    ids = [s["id"] for s in spec["segments"]]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate segment ids in narration.yaml")

    kokoro = None
    segments, total = {}, 0.0
    for seg in spec["segments"]:
        sid, caption = seg["id"], " ".join(seg["text"].split())
        spoken = speakable(seg.get("say", seg["text"]), lexicon)
        key = hashlib.sha1(f"{voice}|{speed}|{lang}|{spoken}".encode()).hexdigest()[:12]
        wav = out_dir / f"{sid}.wav"
        prev = old.get(sid)
        wanted = only is None or sid in only
        if prev and prev["hash"] == key and wav.exists() and not (force and wanted):
            segments[sid] = prev
        elif not wanted and prev and wav.exists():
            segments[sid] = prev  # stale but not requested; keep
        else:
            kokoro = kokoro or load_kokoro()
            audio, sr = synth(kokoro, spoken, voice, speed, lang)
            sf.write(wav, audio, sr)
            segments[sid] = {"file": wav.name, "duration": round(len(audio) / sr, 3), "hash": key,
                             "caption": caption, "spoken": spoken}
            print(f"  rendered {sid:<24} {segments[sid]['duration']:6.2f}s")
        total += segments[sid]["duration"]

    for stale in set(old) - set(segments):
        (out_dir / old[stale]["file"]).unlink(missing_ok=True)
    manifest_path.write_text(json.dumps({"voice": voice, "lang": lang, "speed": speed,
                                         "order": ids, "segments": segments}, indent=2))
    print(f"{len(ids)} segments, {total:.1f}s of speech -> {rel(manifest_path)}")

    if preview:
        parts, sr = [], None
        for sid in ids:
            a, sr = sf.read(out_dir / segments[sid]["file"], dtype="float32")
            parts += [a, np.zeros(int(sr * PREVIEW_GAP_S), dtype="float32")]
        sf.write(out_dir / "preview.wav", np.concatenate(parts), sr)
        print(f"preview -> {rel(out_dir / 'preview.wav')}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("narration", nargs="?", type=Path)
    ap.add_argument("--only", help="comma-separated segment ids")
    ap.add_argument("--force", action="store_true", help="re-render even if unchanged")
    ap.add_argument("--preview", action="store_true", help="also write build/audio/preview.wav")
    ap.add_argument("--say", help="one-off text")
    ap.add_argument("-o", "--out", type=Path, default=Path("say.wav"))
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--lang", default="en-us")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--voices", action="store_true", help="list voices")
    a = ap.parse_args()

    if a.voices:
        print("\n".join(load_kokoro().get_voices()))
    elif a.say:
        audio, sr = synth(load_kokoro(), speakable(a.say, load_lexicon(a.lang)), a.voice, a.speed, a.lang)
        sf.write(a.out, audio, sr)
        print(f"{a.out} ({len(audio) / sr:.2f}s)")
    elif a.narration:
        render_project(a.narration.resolve(), set(a.only.split(",")) if a.only else None, a.force, a.preview)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
