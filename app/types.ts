export interface WordNeighbor {
  word: string;
  sim: number;
}

export interface WordNode {
  word: string;
  family: string;
  cluster: number;
  x: number;
  y: number;
  z: number;
  neighbors: WordNeighbor[];
}

export interface ClusterInfo {
  id: number;
  family: string;
  color: string;
}

export interface WordData {
  words: WordNode[];
  clusters: ClusterInfo[];
}
