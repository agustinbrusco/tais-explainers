"""cot-monitorability scenes.

Render (from the repo root):
    uv run scripts/tts.py projects/cot-monitorability/narration.yaml
    uv run manim -ql --media_dir projects/cot-monitorability/build/media projects/cot-monitorability/manim/scenes.py Hook   # preview 480p15
    uv run manim -qh --media_dir projects/cot-monitorability/build/media projects/cot-monitorability/manim/scenes.py Hook   # final 1080p60
Review:
    uv run scripts/contact_sheet.py projects/cot-monitorability/build/media/videos/scenes/480p15/Hook.mp4
"""

from manim import *  # noqa: F403

from kit.narration import Narrated
from kit.style import C, MOTION, S, apply_manim_defaults

apply_manim_defaults()


def token_card(word: str) -> VGroup:
    label = Text(word, font_size=26, color=C.bg)
    card = RoundedRectangle(corner_radius=0.08, width=max(1.0, label.width + 0.4), height=0.6,
                            fill_color=S.token, fill_opacity=1, stroke_width=0)
    return VGroup(card, label)


class Hook(Narrated, Scene):
    def construct(self):
        words = ["The", "capital", "of", "France", "is"]
        row = VGroup(*[token_card(w) for w in words]).arrange(RIGHT, buff=0.2).to_edge(DOWN, buff=1.2)

        with self.voiceover("hook") as vo:
            self.play(LaggedStart(*[FadeIn(t, shift=UP * 0.2) for t in row], lag_ratio=0.15),
                      run_time=min(vo.duration, 2.5))

        stream = Line(row.get_left() + UP * 2 + LEFT * 0.3, row.get_right() + UP * 2 + RIGHT * 0.3,
                      color=S.residual, stroke_width=3)
        dots = VGroup(*[Dot(t.get_center() + UP * 2, color=S.residual, radius=0.09) for t in row])
        lens = Circle(radius=0.35, color=S.overseer, stroke_width=5).next_to(dots[-1], UP, buff=0.5)
        guess = Text("→ Paris", font_size=30, color=S.overseer).next_to(lens, UP, buff=0.25)

        with self.voiceover("idea") as vo:
            self.play(Create(stream), FadeIn(dots, lag_ratio=0.2), run_time=MOTION.slow)
            self.play(Create(lens), run_time=MOTION.normal)
            self.play(Write(guess), run_time=MOTION.normal)
