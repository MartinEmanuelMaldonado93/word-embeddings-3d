import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import wordData from "~/data/words.json";
import type { ClusterInfo, WordData, WordNode } from "~/types";

const WordCanvas = lazy(() =>
  import("./word-canvas").then((m) => ({ default: m.WordCanvas })),
);

const data = wordData as WordData;

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function Header() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 lg:left-6 lg:top-6">
      <h1 className="text-lg font-bold tracking-tight text-white lg:text-xl">
        Word Embeddings in 3D
      </h1>
      <p className="mt-0.5 hidden text-sm text-neutral-400 lg:mt-1 lg:block">
        GloVe 50d → PCA to 3D · {data.words.length} words · hover a word to see its nearest
        neighbors
      </p>
    </div>
  );
}

function ClusterRows({ clusters }: { clusters: ClusterInfo[] }) {
  return clusters.map((cluster) => (
    <div key={cluster.id} className="flex items-center gap-2 text-sm text-neutral-200">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: cluster.color }}
      />
      <span>{cluster.family}</span>
      <span className="ml-auto pl-4 text-xs text-neutral-500">#{cluster.id}</span>
    </div>
  ));
}

function LegendPill({ clusters }: { clusters: ClusterInfo[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0a0a14]/90 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 backdrop-blur-md"
      >
        Clusters
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 grid gap-1.5 rounded-2xl border border-white/10 bg-[#0a0a14]/95 p-2.5 backdrop-blur-md">
          <ClusterRows clusters={clusters} />
        </div>
      )}
    </div>
  );
}

function LegendPanel({ clusters }: { clusters: ClusterInfo[] }) {
  return (
    <div className="pointer-events-none absolute bottom-6 left-6 z-10 hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md lg:block">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Clusters
      </div>
      <div className="grid gap-1.5">
        <ClusterRows clusters={clusters} />
      </div>
    </div>
  );
}

function NeighborSlider({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (count: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-400 lg:mb-2 lg:gap-6 lg:text-sm">
        <span className="text-neutral-400">Neighbors</span>
        <span className="font-mono text-neutral-100">{value}</span>
      </div>
      <input
        type="range"
        min={3}
        max={8}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-24 accent-emerald-400 lg:w-40"
      />
    </div>
  );
}

function InfoPanel({
  node,
  colorOf,
  neighborCount,
  className,
}: {
  node: WordNode | null;
  colorOf: (word: string) => string;
  neighborCount: number;
  className?: string;
}) {
  if (!node) {
    return (
      <div className="pointer-events-none absolute right-6 top-24 z-10 hidden max-w-56 text-right text-sm text-neutral-500 lg:block">
        Hover or click a word to inspect its nearest neighbors
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 lg:block">
        <div
          className="text-xl font-bold tracking-tight lg:text-2xl"
          style={{ color: colorOf(node.word) }}
        >
          {node.word}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          family: <span className="text-neutral-200">{node.family}</span> · cluster #
          {node.cluster}
        </div>
      </div>
      <div className="mt-3 space-y-1.5 lg:mt-4 lg:space-y-2.5">
        {node.neighbors.slice(0, neighborCount).map((neighbor) => (
          <div key={neighbor.word} className="flex items-center gap-3">
            <span className="w-14 shrink-0 truncate text-sm font-medium text-neutral-100 lg:w-16">
              {neighbor.word}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
              <div
                className="h-full rounded"
                style={{
                  width: `${Math.round(neighbor.sim * 100)}%`,
                  backgroundColor: colorOf(neighbor.word),
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-400">
              {neighbor.sim.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 hidden border-t border-white/10 pt-2 text-[11px] text-neutral-500 lg:mt-4 lg:block">
        Click another word to pin · click empty space to unpin
      </div>
    </div>
  );
}

function CanvasFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#070710]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white" />
        <span className="text-sm text-neutral-500">Loading 3D space...</span>
      </div>
    </div>
  );
}

export function WordSpace() {
  const mounted = useMounted();
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [neighborCount, setNeighborCount] = useState(5);

  const byWord = useMemo(() => new Map(data.words.map((word) => [word.word, word])), []);
  const clusterById = useMemo(
    () => new Map(data.clusters.map((cluster) => [cluster.id, cluster])),
    [],
  );

  const active = pinned ?? hovered;
  const activeNode = active ? byWord.get(active) ?? null : null;

  const highlighted = useMemo(() => {
    const set = new Set<string>();
    if (activeNode) {
      for (const neighbor of activeNode.neighbors.slice(0, neighborCount)) {
        set.add(neighbor.word);
      }
      set.add(activeNode.word);
    }
    return set;
  }, [activeNode, neighborCount]);

  const colorOf = (word: string) => {
    const node = byWord.get(word);
    return node ? (clusterById.get(node.cluster)?.color ?? "#ffffff") : "#ffffff";
  };

  const mobileControls = (
    <div className="flex flex-col gap-2">
      <LegendPill clusters={data.clusters} />
      <NeighborSlider
        value={neighborCount}
        onChange={setNeighborCount}
        className="rounded-2xl border border-white/10 bg-[#0a0a14]/90 p-2 backdrop-blur-md"
      />
    </div>
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070710]">
      <div className="absolute inset-0">
        {mounted ? (
          <Suspense fallback={<CanvasFallback />}>
            <WordCanvas
              nodes={data.words}
              byWord={byWord}
              clusterById={clusterById}
              active={active}
              pinned={pinned}
              isHovered={hovered !== null}
              highlighted={highlighted}
              hasActive={pinned !== null}
              neighborCount={neighborCount}
              onHover={setHovered}
              onPin={(word) => setPinned((current) => (current === word ? null : word))}
              onPointerMissed={() => setPinned(null)}
            />
          </Suspense>
        ) : (
          <CanvasFallback />
        )}
      </div>

      <Header />

      {/* Mobile: bottom split — stacked controls on the left, modal on the right */}
      <div className="absolute inset-x-3 bottom-3 z-10 lg:hidden">
        <div className="grid grid-cols-2 items-end gap-2">
          {mobileControls}
          {activeNode && (
            <InfoPanel
              node={activeNode}
              colorOf={colorOf}
              neighborCount={neighborCount}
              className="max-h-[42vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a14]/90 p-3 backdrop-blur-md"
            />
          )}
        </div>
      </div>

      {/* Desktop */}
      <LegendPanel clusters={data.clusters} />
      <NeighborSlider
        value={neighborCount}
        onChange={setNeighborCount}
        className="absolute bottom-6 right-6 z-10 hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md lg:block"
      />
      <InfoPanel
        node={activeNode}
        colorOf={colorOf}
        neighborCount={neighborCount}
        className="absolute right-6 top-24 z-10 hidden w-72 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md lg:block"
      />
    </div>
  );
}
