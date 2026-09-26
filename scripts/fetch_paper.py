#!/usr/bin/env python3
"""Fetch an arXiv paper into references/<topic>/: PDF + extracted text (both gitignored) and a
metadata entry in sources.yaml (tracked).

    uv run scripts/fetch_paper.py 2507.11473 --topic cot-monitoring
    uv run scripts/fetch_paper.py https://arxiv.org/abs/2401.05566v3 --topic model-organisms
    uv run scripts/fetch_paper.py --restore          # re-download every PDF listed in sources.yaml files

PDFs aren't committed (licensing varies, and they bloat the repo). sources.yaml is the record;
--restore rebuilds the local library on a fresh clone.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / "references"
UA = {"User-Agent": "tais-explainers/0.1 (personal study repo)"}


def arxiv_id(s: str) -> str:
    m = re.search(r"(\d{4}\.\d{4,5})(v\d+)?", s)
    if not m:
        sys.exit(f"Not an arXiv id: {s}")
    return m.group(1)


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


class _CitationMeta(HTMLParser):
    """Collects <meta name="citation_*"> tags (Highwire Press), which every arXiv abs page carries."""

    def __init__(self):
        super().__init__()
        self.meta: dict[str, list[str]] = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and a.get("name", "").startswith("citation_"):
            self.meta.setdefault(a["name"], []).append(" ".join((a.get("content") or "").split()))


def metadata(aid: str) -> dict:
    # The abs page, not export.arxiv.org/api, which has been answering 406.
    p = _CitationMeta()
    p.feed(get(f"https://arxiv.org/abs/{aid}").decode("utf-8", "replace"))
    m = p.meta
    if "citation_title" not in m:
        sys.exit(f"arXiv has no entry for {aid}")
    flip = lambda name: " ".join(reversed([x.strip() for x in name.split(",", 1)]))
    return {
        "id": f"arxiv:{aid}",
        "title": m["citation_title"][0],
        "authors": [flip(a) for a in m.get("citation_author", [])],
        "date": m.get("citation_date", [""])[0].replace("/", "-"),
        "url": f"https://arxiv.org/abs/{aid}",
        "abstract": m.get("citation_abstract", [""])[0],
    }


def download(aid: str, topic_dir: Path) -> Path:
    papers = topic_dir / "papers"
    papers.mkdir(parents=True, exist_ok=True)
    pdf = papers / f"{aid}.pdf"
    if not pdf.exists():
        pdf.write_bytes(get(f"https://arxiv.org/pdf/{aid}"))
    txt = pdf.with_suffix(".txt")
    if not txt.exists():
        subprocess.run(["pdftotext", "-q", "-layout", str(pdf), str(txt)], check=False)
    return pdf


def load_sources(path: Path) -> list[dict]:
    return (yaml.safe_load(path.read_text()) or []) if path.exists() else []


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paper", nargs="?")
    ap.add_argument("--topic")
    ap.add_argument("--restore", action="store_true")
    a = ap.parse_args()

    if a.restore:
        for src in sorted(REFS.glob("*/sources.yaml")):
            for entry in load_sources(src):
                if entry.get("id", "").startswith("arxiv:"):
                    print(download(entry["id"].split(":", 1)[1], src.parent).relative_to(ROOT))
        return
    if not (a.paper and a.topic):
        ap.error("need a paper id and --topic (or --restore)")

    aid, topic_dir = arxiv_id(a.paper), REFS / a.topic
    topic_dir.mkdir(parents=True, exist_ok=True)
    sources_path = topic_dir / "sources.yaml"
    sources = load_sources(sources_path)
    entry = next((s for s in sources if s["id"] == f"arxiv:{aid}"), None)
    if entry is None:
        entry = metadata(aid) | {"read": False, "notes": ""}
        sources.append(entry)
        sources_path.write_text(yaml.safe_dump(sources, sort_keys=False, allow_unicode=True, width=100))
    pdf = download(aid, topic_dir)
    print(f"{entry['title']}\n  {', '.join(entry['authors'][:3])}{' et al.' if len(entry['authors']) > 3 else ''}"
          f" ({entry['date']})\n  pdf: {pdf.relative_to(ROOT)}\n  txt: {pdf.with_suffix('.txt').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
