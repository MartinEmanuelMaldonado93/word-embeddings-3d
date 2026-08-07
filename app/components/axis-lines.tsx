import { Html, Line } from "@react-three/drei";

const AXIS_LENGTH = 10;
const AXIS_COLOR = "#3f3f50";
const AXIS_OPACITY = 0.75;

function AxisLabel({
  position,
  label,
}: {
  position: [number, number, number];
  label: string;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={11}
      zIndexRange={[20, 0]}
      className="pointer-events-none"
    >
      <span className="font-mono text-2xl font-bold text-neutral-500">{label}</span>
    </Html>
  );
}

export function AxisLines() {
  const half = AXIS_LENGTH;
  return (
    <group>
      <Line
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
        points={[
          [0, 0, -half],
          [0, 0, half],
        ]}
        color={AXIS_COLOR}
        lineWidth={1}
        transparent
        opacity={AXIS_OPACITY}
      />
      <AxisLabel position={[half + 0.6, 0, 0]} label="x" />
      <AxisLabel position={[0, half + 0.6, 0]} label="y" />
      <AxisLabel position={[0, 0, half + 0.6]} label="z" />
    </group>
  );
}
