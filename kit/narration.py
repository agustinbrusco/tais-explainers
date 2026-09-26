"""Sync Manim animations to narration rendered by scripts/tts.py.

    from kit.narration import Narrated

    class Intro(Narrated, Scene):
        def construct(self):
            with self.voiceover("intro") as vo:
                self.play(Create(box), run_time=vo.duration * 0.5)
                # the block pads with wait() until the segment's audio ends

The audio is pre-rendered, so the scene's timing is fixed by the narration.
Change the words in narration.yaml, re-run tts.py, re-render, and the timing
follows. The segment text is also emitted as a subcaption (.srt next to the video).
"""

from __future__ import annotations

import inspect
import json
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace


class Narrated:
    #: Resolved relative to the scene file's project (the folder holding narration.yaml).
    manifest_relpath = "build/audio/manifest.json"

    def _manifest(self) -> dict:
        if not hasattr(self, "_narration_manifest"):
            scene_file = Path(inspect.getfile(type(self))).resolve()
            path = _find_project_root(scene_file.parent) / self.manifest_relpath
            if not path.exists():
                raise FileNotFoundError(
                    f"{path} not found. Run: uv run scripts/tts.py <project>/narration.yaml"
                )
            self._narration_manifest = json.loads(path.read_text())
            self._narration_dir = path.parent
        return self._narration_manifest

    @contextmanager
    def voiceover(self, seg_id: str, caption: bool = True):
        seg = self._manifest()["segments"][seg_id]
        audio = self._narration_dir / seg["file"]
        self.add_sound(str(audio))
        if caption:
            self.add_subcaption(seg["caption"], duration=seg["duration"])
        start = self.renderer.time
        vo = SimpleNamespace(
            duration=seg["duration"],
            remaining=lambda: max(0.0, seg["duration"] - (self.renderer.time - start)),
        )
        yield vo
        left = vo.remaining()
        if left > 1e-3:
            self.wait(left)


def _find_project_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / "narration.yaml").exists():
            return p
    raise FileNotFoundError(f"No narration.yaml found at or above {start}")
