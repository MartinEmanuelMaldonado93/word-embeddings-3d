#!/usr/bin/env python3
"""Generate app/data/words.json from GloVe 50d word embeddings.

Pipeline:
  1. Load a small curated word list (5 semantic families, 8 words each).
  2. Pull the 50d GloVe vector for each word (downloaded from gensim-data).
  3. Reduce 50d -> 3d with PCA so the words can live in a 3D scene.
  4. Cluster words (k-means on the raw 50d vectors) for color coding.
  5. Find the top-k nearest neighbors per word by cosine similarity
     (computed in the original 50d space, not the 3D projection).
"""
from __future__ import annotations

import gzip
import json
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

ROOT = Path(__file__).resolve().parent.parent
GLOVE_PATH = ROOT / "scripts" / "data" / "glove-wiki-gigaword-50.gz"
OUT_PATH = ROOT / "app" / "data" / "words.json"

WORDS: dict[str, list[str]] = {
    "royalty": ["king", "queen", "prince", "princess", "monarch", "crown", "throne", "empire"],
    "animals": ["cat", "dog", "horse", "cow", "pig", "bird", "lion", "tiger"],
    "family": ["father", "mother", "brother", "sister", "son", "daughter", "uncle", "aunt"],
    "colors": ["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown"],
    "emotions": ["happy", "sad", "angry", "fear", "love", "hate", "joy", "grief"],
}

K_NEIGHBORS = 8
N_CLUSTERS = len(WORDS)
RANDOM_STATE = 42

CLUSTER_COLORS = [
    "#34d399",
    "#38bdf8",
    "#a78bfa",
    "#fbbf24",
    "#fb7185",
    "#f472b6",
    "#4ade80",
    "#22d3ee",
]


def load_glove(path: Path, wanted: set[str]) -> dict[str, np.ndarray]:
    """Load only the wanted word vectors from a word2vec-text-format GloVe file."""
    vectors: dict[str, np.ndarray] = {}
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        dim = int(fh.readline().split()[1])
        for line in fh:
            parts = line.rstrip("\n").split(" ")
            if len(parts) != dim + 1:
                continue
            word = parts[0]
            if word in wanted:
                vectors[word] = np.asarray(parts[1:], dtype=np.float32)
                if len(vectors) == len(wanted):
                    break
    return vectors


def main() -> None:
    all_words = [w for family in WORDS.values() for w in family]
    raw = load_glove(GLOVE_PATH, set(all_words))

    missing = [w for w in all_words if w not in raw]
    if missing:
        print(f"WARNING: {len(missing)} words missing from vocab: {missing}")

    ordered = [w for w in all_words if w in raw]
    family_of = {w: family for family, words in WORDS.items() for w in words}

    vectors = np.stack([raw[w] for w in ordered])
    normalized = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)

    similarity = normalized @ normalized.T
    neighbor_idx = np.argsort(-similarity, axis=1)[:, 1 : K_NEIGHBORS + 1]

    kmeans = KMeans(n_clusters=N_CLUSTERS, n_init=10, random_state=RANDOM_STATE)
    cluster_labels = kmeans.fit_predict(normalized)

    pca = PCA(n_components=3, random_state=RANDOM_STATE)
    coords = pca.fit_transform(normalized)
    coords *= 8 / np.abs(coords).max()

    cluster_family: dict[int, str] = {}
    for i, word in enumerate(ordered):
        cluster = int(cluster_labels[i])
        family = family_of[word]
        cluster_family[cluster] = cluster_family.get(cluster, family)

    words_out: list[dict] = []
    for i, word in enumerate(ordered):
        neighbors = [
            {"word": ordered[j], "sim": round(float(similarity[i, j]), 3)}
            for j in neighbor_idx[i]
        ]
        words_out.append(
            {
                "word": word,
                "family": family_of[word],
                "cluster": int(cluster_labels[i]),
                "x": round(float(coords[i, 0]), 4),
                "y": round(float(coords[i, 1]), 4),
                "z": round(float(coords[i, 2]), 4),
                "neighbors": neighbors,
            }
        )

    clusters = [
        {
            "id": cluster,
            "family": cluster_family[cluster],
            "color": CLUSTER_COLORS[cluster % len(CLUSTER_COLORS)],
        }
        for cluster in sorted(cluster_family)
    ]

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps({"words": words_out, "clusters": clusters}, indent=2),
        encoding="utf-8",
    )

    variance = pca.explained_variance_ratio_.sum()
    print(f"wrote {OUT_PATH}")
    print(f"words: {len(words_out)}  (missing: {len(missing)})")
    print(f"3D explained variance: {variance:.3f}")


if __name__ == "__main__":
    main()
