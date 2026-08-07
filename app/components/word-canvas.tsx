import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

import type { ClusterInfo, WordNode } from "~/types";
import { WordSprite } from "./word-sprite";
import { NeighborLines } from "./neighbor-lines";
import { AxisLines } from "./axis-lines";

type SceneProps = {
  nodes: WordNode[];
  byWord: Map<string, WordNode>;
  clusterById: Map<number, ClusterInfo>;
  active: string | null;
  isHovered: boolean;
  highlighted: Set<string>;
  hasActive: boolean;
  neighborCount: number;
  expandedMap: Map<string, THREE.Vector3>;
  intensityMap: Map<string, number>;
  onHover: (word: string | null) => void;
  onPin: (word: string) => void;
};

function Scene({
  nodes,
  byWord,
  clusterById,
  active,
  isHovered,
  highlighted,
  hasActive,
  neighborCount,
  expandedMap,
  intensityMap,
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
          expandedPos={expandedMap.get(node.word) ?? null}
          intensity={intensityMap.get(node.word) ?? null}
          onHover={onHover}
          onPin={onPin}
        />
      ))}

      {activeNode && (
        <NeighborLines
          node={activeNode}
          byWord={byWord}
          colorOf={colorOf}
          neighborCount={neighborCount}
          expandedMap={expandedMap}
          intensityMap={intensityMap}
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

function CameraFocus({
  focusPos,
  controlsRef,
}: {
  focusPos: THREE.Vector3 | null;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const animRef = useRef<{
    start: number | null;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    radius: number;
    fromQ: THREE.Quaternion;
    toQ: THREE.Quaternion;
  } | null>(null);
  const animatingRef = useRef(false);
  const hadFocusRef = useRef(false);

  // Cancel animation if user starts orbiting manually
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onStart = () => {
      animatingRef.current = false;
    };
    controls.addEventListener?.("start", onStart);
    return () => controls.removeEventListener?.("start", onStart);
  }, [controlsRef]);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const startTarget = controls.target.clone() as THREE.Vector3;
    const startCam = camera.position.clone() as THREE.Vector3;
    const radius = startCam.length(); // camera stays on a fixed-radius sphere around the ORIGIN
    if (radius < 1e-6) return;

    let toTarget: THREE.Vector3;
    let toCam: THREE.Vector3;

    if (focusPos) {
      // swing around (0,0,0), not around the word — keeps the camera close to center
      const arcAngle = 0.35; // ~20° sweep, small so it never drifts far
      toTarget = focusPos.clone();
      toCam = startCam.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), arcAngle);
      hadFocusRef.current = true;
    } else {
      // focusPos === null → reset to initial view if we had a focus before
      if (!hadFocusRef.current) return;
      toTarget = new THREE.Vector3(0, 0, 0);
      toCam = new THREE.Vector3(9, 4, 22);
      hadFocusRef.current = false;
    }

    const fromQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      startCam.clone().normalize(),
    );
    const toQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      toCam.clone().normalize(),
    );

    animRef.current = {
      start: null,
      fromTarget: startTarget,
      toTarget,
      radius,
      fromQ,
      toQ,
    };
    animatingRef.current = true;
  }, [focusPos, camera, controlsRef]);

  useFrame((state) => {
    if (!animatingRef.current || !animRef.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    if (animRef.current.start === null) animRef.current.start = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - animRef.current.start;
    const duration = 1.0;
    const t = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
    // smoothstep: 3t² - 2t³ — nice "smooth step" ease in/out
    const eased = t * t * (3 - 2 * t);

    const { fromTarget, toTarget, radius, fromQ, toQ } = animRef.current;
    // slerp camera direction → circular swing around the ORIGIN at constant radius
    const q = fromQ.clone().slerp(toQ, eased);
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q);

    controls.target.lerpVectors(fromTarget, toTarget, eased);
    camera.position.copy(dir).multiplyScalar(radius);
    camera.lookAt(controls.target);
    controls.update();

    if (t >= 1) animatingRef.current = false;
  });

  return null;
}

export type WordCanvasProps = Omit<SceneProps, "expandedMap" | "intensityMap"> & {
  onPointerMissed: () => void;
  pinned: string | null;
};

export function WordCanvas({
  nodes,
  byWord,
  clusterById,
  active,
  pinned,
  isHovered,
  highlighted,
  hasActive,
  neighborCount,
  onHover,
  onPin,
  onPointerMissed,
}: WordCanvasProps) {
  const controlsRef = useRef<any>(null);

  const focusPos = useMemo(() => {
    if (!pinned) return null;
    const node = byWord.get(pinned);
    if (!node) return null;
    return new THREE.Vector3(node.x, node.y, node.z);
  }, [pinned, byWord]);

  const expandedMap = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    if (!pinned) return map;
    const activeNode = byWord.get(pinned);
    if (!activeNode) return map;
    const expandBy = 1.15;
    for (const neighbor of activeNode.neighbors.slice(0, neighborCount)) {
      const target = byWord.get(neighbor.word);
      if (!target) continue;
      const dir = new THREE.Vector3(
        target.x - activeNode.x,
        target.y - activeNode.y,
        target.z - activeNode.z,
      );
      const len = dir.length();
      if (len < 1e-6) continue;
      dir.divideScalar(len);
      const expanded = new THREE.Vector3(
        target.x + dir.x * expandBy,
        target.y + dir.y * expandBy,
        target.z + dir.z * expandBy,
      );
      map.set(neighbor.word, expanded);
    }
    return map;
  }, [pinned, byWord, neighborCount]);

  const intensityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!pinned) return map;
    const activeNode = byWord.get(pinned);
    if (!activeNode) return map;
    const slice = activeNode.neighbors.slice(0, neighborCount);
    if (slice.length === 0) return map;
    const sims = slice.map((n) => n.sim);
    const min = Math.min(...sims);
    const max = Math.max(...sims);
    const range = max - min || 1;
    for (const n of slice) {
      const norm = (n.sim - min) / range; // 0..1 rank within visible neighbors
      // map to 0.45..1.0 so lowest still visible but clearly dimmer
      const intensity = 0.45 + norm * 0.55;
      map.set(n.word, intensity);
    }
    return map;
  }, [pinned, byWord, neighborCount]);

  return (
    <Canvas
      camera={{ position: [9, 4, 22], fov: 50 }}
      dpr={[1, 2]}
      onPointerMissed={onPointerMissed}
    >
      <color attach="background" args={["#070710"]} />
      <ambientLight intensity={0.6} />
      <Stars radius={70} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
      <Scene
        nodes={nodes}
        byWord={byWord}
        clusterById={clusterById}
        active={active}
        isHovered={isHovered}
        highlighted={highlighted}
        hasActive={hasActive}
        neighborCount={neighborCount}
        expandedMap={expandedMap}
        intensityMap={intensityMap}
        onHover={onHover}
        onPin={onPin}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={10}
        maxDistance={48}
        enableDamping
        dampingFactor={0.08}
      />
      <CameraFocus focusPos={focusPos} controlsRef={controlsRef} />
    </Canvas>
  );
}
