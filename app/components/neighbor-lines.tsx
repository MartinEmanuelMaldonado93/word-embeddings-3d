import { Line } from "@react-three/drei";

import type { WordNode } from "~/types";

interface NeighborLinesProps {
  node: WordNode;
  byWord: Map<string, WordNode>;
  colorOf: (word: string) => string;
  neighborCount: number;
}

export function NeighborLines({
  node,
  byWord,
  colorOf,
  neighborCount,
}: NeighborLinesProps) {
  return (
    <group>
      {node.neighbors.slice(0, neighborCount).map((neighbor) => {
        const targetNode = byWord.get(neighbor.word);
        if (!targetNode) return null;
        return (
          <Line
            key={neighbor.word}
            points={[
              [node.x, node.y, node.z],
              [targetNode.x, targetNode.y, targetNode.z],
            ]}
            color={colorOf(neighbor.word)}
            lineWidth={1.6}
            transparent
            opacity={0.6}
          />
        );
      })}
    </group>
  );
}
