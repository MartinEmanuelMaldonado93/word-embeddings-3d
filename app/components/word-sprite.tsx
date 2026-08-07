import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

import type { WordNode } from "~/types";

const FONT = "700 96px Inter, ui-sans-serif, system-ui, sans-serif";
const TEXTURE_HEIGHT = 160;
const BASE_HEIGHT = 2.05;
const APPEAR_DURATION = 0.9;
const START_SCALE = 0.6;
const MAX_STAGGER = 1.2;

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
    ctx.shadowColor = "rgba(255,255,255,0.15)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#90909c";
    ctx.globalAlpha = 0.45;
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
  hasActive: boolean;
  onHover: (word: string | null) => void;
  onPin: (word: string) => void;
}

export function WordSprite({
  node,
  color,
  isActive,
  isHighlighted,
  hasActive,
  onHover,
  onPin,
}: WordSpriteProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  const target = useRef(new THREE.Vector3());
  const targetOpacity = useRef(1);
  const revealScale = useRef(new THREE.Vector3());
  const startRef = useRef<number | null>(null);
  const delay = useMemo(() => Math.random() * MAX_STAGGER, []);
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
    targetOpacity.current = isActive || isHighlighted ? 1 : hasActive ? 0 : 1;
  }, [isActive, isHighlighted, hasActive]);

  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.scale.copy(baseScale).multiplyScalar(START_SCALE);
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

  useFrame((state, delta) => {
    const sprite = spriteRef.current;
    const material = materialRef.current;
    if (!sprite || !material) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startRef.current - delay;
    const reveal = THREE.MathUtils.smoothstep(
      elapsed / APPEAR_DURATION,
      0,
      1,
    );
    const scaleFactor = START_SCALE + (1 - START_SCALE) * reveal;
    sprite.scale.lerp(
      revealScale.current.set(
        target.current.x * scaleFactor,
        target.current.y * scaleFactor,
        target.current.z * scaleFactor,
      ),
      Math.min(1, delta * 9),
    );
    material.opacity +=
      (targetOpacity.current * reveal - material.opacity) *
      Math.min(1, delta * 9);
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
        opacity={0}
      />
    </sprite>
  );
}
