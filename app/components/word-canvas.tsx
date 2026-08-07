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
    fromCam: THREE.Vector3;
    toTarget: THREE.Vector3;
    toCam: THREE.Vector3;
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

    if (focusPos) {
      // Keep exact same distance — orbit/pan to center word, no zoom
      const dir = new THREE.Vector3().subVectors(startCam, startTarget).normalize();
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      const dist = startCam.distanceTo(startTarget);

      const toTarget = focusPos.clone();
      const toCam = toTarget.clone().add(dir.multiplyScalar(dist));

      animRef.current = {
        start: null,
        fromTarget: startTarget,
        fromCam: startCam,
        toTarget,
        toCam,
      };
      animatingRef.current = true;
      hadFocusRef.current = true;
      return;
    }

    // focusPos === null → reset to initial view if we had a focus before
    if (!hadFocusRef.current) return;
    const toTarget = new THREE.Vector3(0, 0, 0);
    const toCam = new THREE.Vector3(9, 4, 22);

    animRef.current = {
      start: null,
      fromTarget: startTarget,
      fromCam: startCam,
      toTarget,
      toCam,
    };
    animatingRef.current = true;
    hadFocusRef.current = false;
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

    controls.target.lerpVectors(animRef.current.fromTarget, animRef.current.toTarget, eased);
    camera.position.lerpVectors(animRef.current.fromCam, animRef.current.toCam, eased);
    controls.update();

    if (t >= 1) animatingRef.current = false;
  });

  return null;
}

export type WordCanvasProps = SceneProps & {
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
