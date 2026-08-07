import type { Route } from "./+types/home";
import { WordSpace } from "~/components/word-space";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Word Embeddings 3D" },
    {
      name: "description",
      content:
        "Interactive 3D map of word embeddings: GloVe vectors reduced to 3D with PCA, hover a word to see its nearest neighbors.",
    },
  ];
}

export default function Home() {
  return <WordSpace />;
}
