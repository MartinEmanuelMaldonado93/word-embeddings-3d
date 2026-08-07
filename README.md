# Word Embeddings 3D

Interactive 3D map of word embeddings: words float in space, and semantically
close words (nearby in vector space) sit next to each other — the same idea as
the famous 3Blue1Brown LLM video, hyper-simplified.

## How it works

1. **Embeddings (offline, Python)** — `scripts/embed.py` loads a small
   curated list of 40 English words and pulls their 50-dimensional
   [GloVe](https://nlp.stanford.edu/projects/glove/) vectors.
2. **Dimensionality reduction** — PCA projects 50d → 3d (deterministic, ~52%
   of the variance kept). Words are clustered with k-means for color coding.
3. **Neighbors** — the top-5 nearest neighbors per word are computed by cosine
   similarity in the original 50d space (more faithful than the 3D projection).
4. **Rendering** — React Router 8 + React 19 + `three` + `@react-three/fiber`.
   Hover a word to grow it, highlight its cluster, and draw lines to its
   nearest neighbors.

## Development

Uses [Bun](https://bun.sh) as package manager and runner.

```bash
bun install
bun dev          # dev server with HMR
bun run build    # production build
bun run start    # serve the production build
bun run typecheck
```

## Regenerating the word data

```bash
./venv/bin/python scripts/embed.py
```

This rewrites `app/data/words.json`. Edit `WORDS` in `scripts/embed.py` to
change the vocabulary, then re-run.

### Python environment (first time)

```bash
python3 -m venv venv
./venv/bin/pip install numpy scikit-learn
```

The GloVe vectors (`scripts/data/glove-wiki-gigaword-50.gz`, ~66 MB) are
downloaded once from [gensim-data](https://github.com/RaRe-Technologies/gensim-data).

## Stack

React Router 8 (framework mode) · React 19 · TypeScript 7 · three 0.185 ·
@react-three/fiber 9 · @react-three/drei 10 · Tailwind CSS 4 · Vite 8 · Bun
