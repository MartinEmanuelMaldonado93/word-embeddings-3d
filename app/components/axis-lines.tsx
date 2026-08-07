import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";

const AXIS_LENGTH = 10;
const AXIS_COLOR = "#3f3f50";
const AXIS_OPACITY = 0.75;
const GROW_DURATION = 0.8;
const AXIS_DELAYS = [0, 0.25, 0.5];
const LABEL_DELAYS = [0.6, 0.85, 1.1];

function AxisLabel({
  position,
  label,
  delay,
}: {
  position: [number, number, number];
  label: string;
  delay: number;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={11}
      zIndexRange={[20, 0]}
      className="pointer-events-none"
    >
      <span
        className="animate-axis-fade font-mono text-2xl font-bold text-neutral-500"
        style={{ animationDelay: `${delay}s` }}
      >
        {label}
      </span>
    </Html>
  );
}

export function AxisLines() {
  const half = AXIS_LENGTH;
  const xRef = useRef<Line2 | null>(null);
  const yRef = useRef<Line2 | null>(null);
  const zRef = useRef<Line2 | null>(null);
  const startRef = useRef<number | null>(null);
  const refs = [xRef, yRef, zRef];

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startRef.current;
    refs.forEach((ref, i) => {
      const line = ref.current;
      if (!line) return;
      const progress = THREE.MathUtils.smoothstep(
        (elapsed - AXIS_DELAYS[i]) / GROW_DURATION,
        0,
        1,
      );
      line.scale.setScalar(Math.max(0.0001, progress));
    });
  });

  return (
    <group>
      <Line
        ref={xRef}
        points={[
          [-half, 0, 0],
          [half, 0, 0],
        ]}
        color={AXIS_COLOR}
        lineWidth={1}
        transparent
        opacity={AXIS_OPACITY}
      />
      <Line
        ref={yRef}
        points={[
          [0, -half, 0],
          [0, half, 0],
        ]}
        color={AXIS_COLOR}
        lineWidth={1}
        transparent
        opacity={AXIS_OPACITY}
      />
      <Line
        ref={zRef}
        points={[
          [0, 0, -half],
          [0, 0, half],
        ]}
        color={AXIS_COLOR}
        lineWidth={1}
        transparent
        opacity={AXIS_OPACITY}
      />
      <AxisLabel position={[half + 0.6, 0, 0]} label="x" delay={LABEL_DELAYS[0]} />
      <AxisLabel position={[0, half + 0.6, 0]} label="y" delay={LABEL_DELAYS[1]} />
      <AxisLabel position={[0, 0, half + 0.6]} label="z" delay={LABEL_DELAYS[2]} />
    </group>
  );
}
