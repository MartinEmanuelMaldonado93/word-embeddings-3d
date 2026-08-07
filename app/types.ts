export type WordNeighbor = {
  word: string;
  sim: number;
};

export type WordNode = {
  word: string;
  family: string;
  cluster: number;
  x: number;
  y: number;
  z: number;
  neighbors: WordNeighbor[];
};

export type ClusterInfo = {
  id: number;
  family: string;
  color: string;
};

export type WordData = {
  words: WordNode[];
  clusters: ClusterInfo[];
};
