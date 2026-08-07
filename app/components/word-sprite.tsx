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
// size maps intensity (0.45..1.0) so low-sim neighbors shrink below base size
const NEIGHBOR_MIN_SCALE = 0.82;
const NEIGHBOR_MAX_SCALE = 1.22;
const INTENSITY_MIN = 0.45;
const INTENSITY_RANGE = 0.55;

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

type WordSpriteProps = {
  node: WordNode;
  color: string;
  isActive: boolean;
  isHighlighted: boolean;
  hasActive: boolean;
  expandedPos: THREE.Vector3 | null;
  intensity: number | null;
  onHover: (word: string | null) => void;
  onPin: (word: string) => void;
};

export function WordSprite({
  node,
  color,
  isActive,
  isHighlighted,
  hasActive,
  expandedPos,
  intensity,
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
  const originalPos = useMemo(
    () => new THREE.Vector3(node.x, node.y, node.z),
    [node.x, node.y, node.z],
  );
  const floatPhase = useMemo(() => {
    let h = 0;
    for (let i = 0; i < node.word.length; i++) h = (h * 31 + node.word.charCodeAt(i)) % 1000;
    return (h / 1000) * Math.PI * 2;
  }, [node.word]);

  const dim = !isActive && !isHighlighted;

  const brightTexture = useMemo(() => makeTexture(node.word, false), [node.word]);
  const dimTexture = useMemo(() => makeTexture(node.word, true), [node.word]);

  const baseScale = useMemo(() => {
    const aspect = brightTexture.image.width / brightTexture.image.height;
    return new THREE.Vector3(aspect * BASE_HEIGHT, BASE_HEIGHT, 1);
  }, [brightTexture]);

  useEffect(() => {
    // scale maps similarity intensity when pinned: low sim shrinks below base size
    const t = THREE.MathUtils.clamp(
      ((intensity ?? 1) - INTENSITY_MIN) / INTENSITY_RANGE,
      0,
      1,
    );
    const factor = isActive
      ? 1.28
      : isHighlighted
        ? THREE.MathUtils.lerp(NEIGHBOR_MIN_SCALE, NEIGHBOR_MAX_SCALE, t)
        : 1;
    target.current.set(
      baseScale.x * factor,
      baseScale.y * factor,
      baseScale.z,
    );
  }, [baseScale, isActive, isHighlighted, intensity]);

  useEffect(() => {
    if (isActive || !isHighlighted) {
      targetOpacity.current = isActive || isHighlighted ? 1 : hasActive ? 0 : 1;
    } else {
      // highlighted neighbor: opacity tracks intensity (dimmer for low sim)
      const t = intensity ?? 1;
      targetOpacity.current = 0.62 + t * 0.38;
    }
  }, [isActive, isHighlighted, hasActive, intensity]);

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
    if (isActive) {
      materialRef.current?.color.set("#ffffff");
      return;
    }
    if (!isHighlighted) {
      materialRef.current?.color.set("#ffffff");
      return;
    }
    if (intensity == null) {
      materialRef.current?.color.set(color);
      return;
    }
    // blend cluster color toward muted gray for low intensity
    const c = new THREE.Color(color);
    const gray = new THREE.Color("#6e6e7e");
    c.lerp(gray, 1 - intensity);
    materialRef.current?.color.set(c);
  }, [color, isActive, isHighlighted, intensity]);

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

    // expanded position + enhanced floating when neighbor of pinned word
    const base = expandedPos ?? originalPos;
    const isPinnedNeighbor = !!expandedPos;
    const idleAmp = 0.025;
    const activeAmp = isPinnedNeighbor ? 0.14 : isActive || isHighlighted ? 0.05 : idleAmp;
    const speed = isPinnedNeighbor ? 1.15 : 0.65;
    const floatY = Math.sin(state.clock.elapsedTime * speed + floatPhase) * activeAmp;
    const floatX = Math.cos(state.clock.elapsedTime * speed * 0.7 + floatPhase) * activeAmp * 0.35;
    const floatZ = Math.sin(state.clock.elapsedTime * speed * 0.5 + floatPhase * 1.3) * activeAmp * 0.25;
    const targetPos = new THREE.Vector3(
      base.x + floatX,
      base.y + floatY,
      base.z + floatZ,
    );
    // smooth lerp to targetPos (expand) — a bit slower to feel like flow
    const posLerp = isPinnedNeighbor ? 2.5 : 3.5;
    sprite.position.lerp(targetPos, Math.min(1, delta * posLerp));
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
