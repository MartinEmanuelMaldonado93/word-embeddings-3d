import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";

import type { WordNode } from "~/types";

type NeighborLinesProps = {
  node: WordNode;
  byWord: Map<string, WordNode>;
  colorOf: (word: string) => string;
  neighborCount: number;
  expandedMap: Map<string, THREE.Vector3>;
  intensityMap: Map<string, number>;
};

export function NeighborLines({
  node,
  byWord,
  colorOf,
  neighborCount,
  expandedMap,
  intensityMap,
}: NeighborLinesProps) {
  const lineRefs = useRef<(Line2 | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const slice = node.neighbors.slice(0, neighborCount);
    lineRefs.current.forEach((line, i) => {
      if (!line) return;
      const neighbor = slice[i];
      const intensity = neighbor ? (intensityMap.get(neighbor.word) ?? 1) : 1;
      const base = 0.38 + intensity * 0.4;
      const mat = (line as any).material as any;
      if (mat && typeof mat.opacity === "number") {
        mat.opacity = base + Math.sin(t * 1.4 + i * 0.9) * 0.08;
      }
    });
  });

  return (
    <group>
      {node.neighbors.slice(0, neighborCount).map((neighbor, idx) => {
        const targetNode = byWord.get(neighbor.word);
        if (!targetNode) return null;
        const expanded = expandedMap.get(neighbor.word);
        const end: [number, number, number] = expanded
          ? [expanded.x, expanded.y, expanded.z]
          : [targetNode.x, targetNode.y, targetNode.z];
        const base = colorOf(neighbor.word);
        const intensity = intensityMap.get(neighbor.word) ?? 1;
        const c = new THREE.Color(base);
        c.lerp(new THREE.Color("#6e6e7e"), 1 - intensity);
        // line width also tracks intensity slightly
        const w = 1.2 + intensity * 1.1;
        const baseOpacity = 0.38 + intensity * 0.4;
        return (
          <Line
            key={neighbor.word}
            ref={(el: any) => {
              lineRefs.current[idx] = el;
            }}
            points={[
              [node.x, node.y, node.z],
              end,
            ]}
            color={c.getStyle()}
            lineWidth={w}
            transparent
            opacity={baseOpacity}
          />
        );
      })}
    </group>
  );
}
