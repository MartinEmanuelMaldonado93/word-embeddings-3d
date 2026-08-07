import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";

import wordData from "~/data/words.json";
import type { ClusterInfo, WordData, WordNode } from "~/types";
import { WordSprite } from "./word-sprite";
import { NeighborLines } from "./neighbor-lines";
import { AxisLines } from "./axis-lines";

const data = wordData as WordData;

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface SceneProps {
  nodes: WordNode[];
  byWord: Map<string, WordNode>;
  clusterById: Map<number, ClusterInfo>;
  active: string | null;
  isHovered: boolean;
  highlighted: Set<string>;
  hasActive: boolean;
  onHover: (word: string | null) => void;
  onPin: (word: string) => void;
}

function Scene({
  nodes,
  byWord,
  clusterById,
  active,
  isHovered,
  highlighted,
  hasActive,
  onHover,
  onPin,
}: SceneProps) {
  const activeNode = active ? byWord.get(active) : undefined;
  const colorOf = (word: string) =>
    (() => {
      const node = byWord.get(word);
      return node ? (clusterById.get(node.cluster)?.color ?? "#ffffff") : "#ffffff";
    })();

  return (
    <>
      <AxisLines />

      {nodes.map((node) => (
        <WordSprite
          key={node.word}
          node={node}
          color={clusterById.get(node.cluster)?.color ?? "#ffffff"}
          isActive={node.word === active}
          isHighlighted={highlighted.has(node.word)}
          hasActive={hasActive}
          onHover={onHover}
          onPin={onPin}
        />
      ))}

      {activeNode && (
        <NeighborLines
          node={activeNode}
          byWord={byWord}
          colorOf={colorOf}
        />
      )}

      {activeNode && isHovered && (
        <Html
          position={[activeNode.x, activeNode.y + 2.6, activeNode.z]}
          center
          distanceFactor={9}
          zIndexRange={[20, 0]}
          className="pointer-events-none"
        >
          <div className="whitespace-nowrap rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 text-sm font-medium text-neutral-100 backdrop-blur-sm">
            {activeNode.word}
            <span className="ml-2 text-neutral-400">{activeNode.family}</span>
          </div>
        </Html>
      )}
    </>
  );
}

function Header() {
  return (
    <div className="pointer-events-none absolute left-6 top-6 z-10">
      <h1 className="text-xl font-bold tracking-tight text-white">
        Word Embeddings in 3D
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        GloVe 50d → PCA to 3D · {data.words.length} words · hover a word to see
        its nearest neighbors
      </p>
    </div>
  );
}

function Legend({ clusters }: { clusters: ClusterInfo[] }) {
  return (
    <div className="pointer-events-none absolute bottom-6 left-6 z-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Clusters
      </div>
      <div className="grid gap-1.5">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="flex items-center gap-2 text-sm text-neutral-200">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: cluster.color }}
            />
            <span>{cluster.family}</span>
            <span className="ml-auto pl-4 text-xs text-neutral-500">
              #{cluster.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({
  node,
  colorOf,
}: {
  node: WordNode | null;
  colorOf: (word: string) => string;
}) {
  if (!node) {
    return (
      <div className="pointer-events-none absolute right-6 top-24 z-10 max-w-56 text-right text-sm text-neutral-500">
        Hover or click a word to inspect its nearest neighbors
      </div>
    );
  }

  return (
    <div className="absolute right-6 top-24 z-10 w-72 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div
        className="text-2xl font-bold tracking-tight"
        style={{ color: colorOf(node.word) }}
      >
        {node.word}
      </div>
      <div className="mt-1 text-xs text-neutral-400">
        family: <span className="text-neutral-200">{node.family}</span> ·
        cluster #{node.cluster}
      </div>
      <div className="mt-4 space-y-2.5">
        {node.neighbors.map((neighbor) => (
          <div key={neighbor.word} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-medium text-neutral-100">
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
      <div className="mt-4 border-t border-white/10 pt-2 text-[11px] text-neutral-500">
        Click another word to pin · click empty space to unpin
      </div>
    </div>
  );
}

export function WordSpace() {
  const mounted = useMounted();
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const byWord = useMemo(
    () => new Map(data.words.map((word) => [word.word, word])),
    [],
  );
  const clusterById = useMemo(
    () => new Map(data.clusters.map((cluster) => [cluster.id, cluster])),
    [],
  );

  const active = pinned ?? hovered;
  const activeNode = active ? byWord.get(active) ?? null : null;

  const highlighted = useMemo(() => {
    const set = new Set<string>();
    if (activeNode) {
      for (const neighbor of activeNode.neighbors) set.add(neighbor.word);
      set.add(activeNode.word);
    }
    return set;
  }, [activeNode]);

  if (!mounted) {
    return <div className="h-screen w-screen" />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 26], fov: 50 }}
        dpr={[1, 2]}
        onPointerMissed={() => setPinned(null)}
      >
        <color attach="background" args={["#070710"]} />
        <ambientLight intensity={0.6} />
        <Stars radius={70} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
        <Scene
          nodes={data.words}
          byWord={byWord}
          clusterById={clusterById}
          active={active}
          isHovered={hovered !== null}
          highlighted={highlighted}
          hasActive={pinned !== null}
          onHover={setHovered}
          onPin={(word) => setPinned((current) => (current === word ? null : word))}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={10}
          maxDistance={48}
        />
      </Canvas>

      <Header />
      <Legend clusters={data.clusters} />
      <InfoPanel
        node={activeNode}
        colorOf={(word) => {
          const node = byWord.get(word);
          return node ? (clusterById.get(node.cluster)?.color ?? "#ffffff") : "#ffffff";
        }}
      />
    </div>
  );
}
