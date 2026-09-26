# References

One folder per topic. Each has:

- `README.md`: the dossier (what it is, primary sources, key claims *with locations*, prerequisites,
  misconceptions, open questions). Built with the `research` skill.
- `sources.yaml`: the source list, tracked. `uv run scripts/fetch_paper.py <arxiv-id> --topic <topic>` adds to it.
- `papers/`: PDFs + extracted text, gitignored. On a fresh clone, run `uv run scripts/fetch_paper.py --restore`.

A source is marked `read: true` only once its relevant sections have actually been read, not just the abstract.
Verification tags in dossiers: **[verified-opened]** means the source was opened and checked, **[search-result-only]**
means it's located but not yet read.

## Topics

| topic | what it covers | status |
|---|---|---|
| [foundations](foundations/) | residual stream, logit / tuned lens, probing, linear representations, SAEs | seeded |
