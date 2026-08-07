import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

import type { WordNode } from "~/types";

const FONT = "700 96px Inter, ui-sans-serif, system-ui, sans-serif";
const TEXTURE_HEIGHT = 160;
const BASE_HEIGHT = 2.05;

export function mixHex(hex: string, other: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

function makeTexture(word: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  const width = Math.ceil(ctx.measureText(word).width) + 96;
  canvas.width = width;
  canvas.height = TEXTURE_HEIGHT;

  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#ffffff";
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

  const texture = useMemo(() => makeTexture(node.word), [node.word]);

  const baseScale = useMemo(() => {
    const aspect = texture.image.width / texture.image.height;
    return new THREE.Vector3(aspect * BASE_HEIGHT, BASE_HEIGHT, 1);
  }, [texture]);

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
    return () => texture.dispose();
  }, [baseScale, texture]);

  useEffect(() => {
    const tint = isActive
      ? "#ffffff"
      : isHighlighted
        ? mixHex(color, "#ffffff", 0.5)
        : color;
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
        map={texture}
        transparent
        depthWrite={false}
      />
    </sprite>
  );
}
