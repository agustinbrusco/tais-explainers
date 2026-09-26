---
name: research
description: Build or extend a verified reference dossier in references/<topic>/ for a TAIS concept — find primary sources, fetch and read them, extract the claims an explainer must get right, prerequisites, misconceptions and open questions. Use before scripting any explainer, when the learner asks "what's the source for…", or when a new paper on a topic appears.
---

# Building a reference dossier

A dossier is what makes an explainer rigorous. Its job is to let a future session answer "where exactly does it say
that?" without searching again.

## Structure of `references/<topic>/`
- `README.md` is the dossier: what the concept is (precise, 2–4 sentences), primary sources, key claims *with
  locations*, prerequisites, common misconceptions and overclaims, open or contested questions, and related topics.
  Put `Last reviewed: YYYY-MM-DD` at the top.
- `sources.yaml` is one entry per source. arXiv papers go in via `uv run scripts/fetch_paper.py <id> --topic <topic>`.
  Blog posts, Transformer Circuits pages, and forum posts are added by hand with `id`, `title`, `authors`, `date`, `url`,
  `accessed`, `read`, and `notes`.
- `papers/` holds the PDFs and extracted `.txt` files. It's gitignored, and `fetch_paper.py --restore` rebuilds it.
- `notes/<source-id>.md` (optional) holds reading notes for one source: section-by-section, with short quotes and page numbers.

## Procedure
1. **Pin down the term.** New or ambiguous terms (e.g. anything coined in 2026) might mean several things. Search
   broadly, list the candidate meanings with evidence, and ask the learner if it's still ambiguous.
2. **Primary sources first:** the paper or post that introduced the idea, then the strongest follow-ups and
   critiques. Secondary explainers are only for finding the primaries.
3. **Actually read.** Open the source (the `.txt` for papers). Quote the key claim, with its location. Mark each
   source `read: true` only after reading the relevant sections, not just the abstract.
4. **Hunt for the caveats**: limitations sections, appendices, the results the authors say are weak, and replications
   and failed replications.
5. **Date everything.** This field moves quickly, and "as of" matters.
6. **Update `references/README.md`**, the topic index.

## Rules
- Never write a title, author list, date, number or URL from memory. Copy it from the source.
- If a source can't be accessed, say so in the dossier instead of paraphrasing what it "probably" says.
- Keep "the paper shows", "the authors argue", and "open question" visibly separate.
