import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

import type { WordNode } from "~/types";

const FONT = "700 96px Inter, ui-sans-serif, system-ui, sans-serif";
const TEXTURE_HEIGHT = 160;
const BASE_HEIGHT = 2.05;

function makeTexture(word: string, dim: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  const width = Math.ceil(ctx.measureText(word).width) + 96;
  canvas.width = width;
  canvas.height = TEXTURE_HEIGHT;

  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (dim) {
    ctx.shadowColor = "rgba(255,255,255,0.2)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#90909c";
  } else {
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ffffff";
  }
  ctx.fillText(word, width / 2, TEXTURE_HEIGHT / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

interface WordSpriteProps {
  node: WordNode;
  color: string;
  isActive: boolean;
  isHighlighted: boolean;
  onHover: (word: string | null) => void;
  onPin: (word: string) => void;
}

export function WordSprite({
  node,
  color,
  isActive,
  isHighlighted,
  onHover,
  onPin,
}: WordSpriteProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  const target = useRef(new THREE.Vector3());
  const [hovering, setHovering] = useState(false);
  useCursor(hovering);

  const dim = !isActive && !isHighlighted;

  const brightTexture = useMemo(() => makeTexture(node.word, false), [node.word]);
  const dimTexture = useMemo(() => makeTexture(node.word, true), [node.word]);

  const baseScale = useMemo(() => {
    const aspect = brightTexture.image.width / brightTexture.image.height;
    return new THREE.Vector3(aspect * BASE_HEIGHT, BASE_HEIGHT, 1);
  }, [brightTexture]);

  useEffect(() => {
    const factor = isActive ? 1.28 : isHighlighted ? 1.12 : 1;
    target.current.set(
      baseScale.x * factor,
      baseScale.y * factor,
      baseScale.z,
    );
  }, [baseScale, isActive, isHighlighted]);

  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.scale.copy(baseScale);
    }
    return () => {
      brightTexture.dispose();
      dimTexture.dispose();
    };
  }, [baseScale, brightTexture, dimTexture]);

  useEffect(() => {
    const material = materialRef.current;
    if (material) {
      material.map = dim ? dimTexture : brightTexture;
      material.needsUpdate = true;
    }
  }, [dim, brightTexture, dimTexture]);

  useEffect(() => {
    const tint = isActive ? "#ffffff" : isHighlighted ? color : "#ffffff";
    materialRef.current?.color.set(tint);
  }, [color, isActive, isHighlighted]);

  useFrame((_, delta) => {
    const sprite = spriteRef.current;
    if (sprite) {
      sprite.scale.lerp(target.current, Math.min(1, delta * 9));
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={[node.x, node.y, node.z]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovering(true);
        onHover(node.word);
      }}
      onPointerOut={() => {
        setHovering(false);
        onHover(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onPin(node.word);
      }}
    >
      <spriteMaterial
        ref={materialRef}
        map={brightTexture}
        transparent
        depthWrite={false}
      />
    </sprite>
  );
}
