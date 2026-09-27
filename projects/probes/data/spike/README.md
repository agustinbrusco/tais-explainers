# Feasibility spike (2026-09-26): scratch quality, kept for provenance

The numbers in the brief's "Feasibility, already run" table come from these scripts: Opus's in this folder and Fable's in
`fable/`, both run on Qwen/Qwen2.5-1.5B (base, fp32, CPU). They are **not** the piece's data pipeline. After the brief is
agreed, they get rewritten as `data/` scripts with one pinned protocol (split, regularization, seeds, layer indexing),
because the two runs differ in details (e.g. the L12 inversion is 0.106 here and 0.025 in Fable's run).

- Inputs: Marks & Tegmark's geometry-of-truth CSVs (cities, neg_cities, sp_en_trans, neg_sp_en_trans), downloaded into
  `data/` next to the scripts. **Not committed**: their repo has no license (the piece will regenerate its own statements).
- `extract.py` writes `acts_<model>_<set>.npz` (final-token hidden states, every layer; ~125 MB each; not committed).
- Layer convention: `hidden_states[l]`, l = 0 embeddings, l = output of block l-1; the last entry is after the final norm.
- `FINDINGS.md` is the running log of results. `analyze.py`, `neg.py`, `gen.py`, `textbase.py`: probes, negation,
  generalization matrix, country-name baseline. `steer.py` (v1, pushes too small), `steer2.py` (v2, L16, three push
  conventions), `sketch*.py`: raw matplotlib sketches (copies in `build/sketches/`).
- Scripts expect to sit next to `data/` and the `.npz` files (paths are relative to the script's folder).
