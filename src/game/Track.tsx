import * as THREE from "three";
import type { TrackDef, TrackSegment, BoostPad } from "./tracks";

const ROAD_COLOR = "#1a1a35";
const GRID_COLOR = "#2a3a6a";
const WALL_COLOR = "#080818";

function RoadSegment({ pos, size }: TrackSegment) {
  return (
    <group position={pos}>
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={ROAD_COLOR} roughness={0.8} metalness={0.1} />
      </mesh>
      <gridHelper
        args={[size[0], Math.max(2, Math.round(size[0] / 4)), GRID_COLOR, GRID_COLOR]}
        position={[0, size[1] / 2 + 0.01, 0]}
      />
    </group>
  );
}

function Wall({ pos, size }: TrackSegment) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={WALL_COLOR} roughness={0.6} metalness={0.4} />
    </mesh>
  );
}

function GlowEdge({
  start,
  end,
  color,
  width = 0.3,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  width?: number;
}) {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const mid = s.clone().add(e).multiplyScalar(0.5);
  const length = s.distanceTo(e);
  const dir = e.clone().sub(s).normalize();
  const angle = Math.atan2(dir.x, dir.z);

  return (
    <mesh position={[mid.x, mid.y, mid.z]} rotation={[0, angle, 0]}>
      <boxGeometry args={[width, 0.15, length]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        toneMapped={false}
      />
    </mesh>
  );
}

function BoostPadMesh({ position, size }: BoostPad) {
  const BOOST_COLOR = "#ff6600";
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={BOOST_COLOR}
          emissive={BOOST_COLOR}
          emissiveIntensity={2}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>
      <pointLight color={BOOST_COLOR} intensity={4} distance={8} decay={2} position={[0, 1, 0]} />
    </group>
  );
}

function StartFinishLine({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0.26, z]}>
      <mesh>
        <boxGeometry args={[10, 0.05, 1.5]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={4} distance={12} decay={2} position={[0, 1, 0]} />
    </group>
  );
}

interface TrackProps {
  trackDef: TrackDef;
}

export default function Track({ trackDef }: TrackProps) {
  const { accentColor, groundColor, roads, outerWalls, innerWalls, boostPads, carStart, finish } = trackDef;
  const finishZ = (finish.zMin + finish.zMax) / 2;

  // Compute outer edge lines from outer walls
  const sx = outerWalls[2].pos[0] - 1; // east outer wall x - 1
  const sz = outerWalls[0].pos[2] - 1; // north outer wall z - 1

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>

      {/* Road segments */}
      {roads.map((seg, i) => (
        <RoadSegment key={i} {...seg} />
      ))}

      {/* Outer walls */}
      {outerWalls.map((w, i) => (
        <Wall key={`ow-${i}`} {...w} />
      ))}

      {/* Inner walls */}
      {innerWalls.map((w, i) => (
        <Wall key={`iw-${i}`} {...w} />
      ))}

      {/* Outer glow edges */}
      <GlowEdge start={[-sx, 0.52, sz]} end={[sx, 0.52, sz]} color={accentColor} />
      <GlowEdge start={[-sx, 0.52, -sz]} end={[sx, 0.52, -sz]} color={accentColor} />
      <GlowEdge start={[sx, 0.52, sz]} end={[sx, 0.52, -sz]} color={accentColor} />
      <GlowEdge start={[-sx, 0.52, sz]} end={[-sx, 0.52, -sz]} color={accentColor} />

      {/* Boost pads */}
      {boostPads.map((pad, i) => (
        <BoostPadMesh key={i} {...pad} />
      ))}

      {/* Start/finish line */}
      <StartFinishLine x={0} z={finishZ} color={accentColor} />

      {/* Corner accent lights */}
      <pointLight color={accentColor} intensity={5} distance={55} decay={2} position={[sx * 0.7, 5, sz * 0.7]} />
      <pointLight color={accentColor} intensity={5} distance={55} decay={2} position={[-sx * 0.7, 5, -sz * 0.7]} />
      <pointLight color="#ff0044" intensity={4} distance={45} decay={2} position={[sx * 0.7, 4, -sz * 0.7]} />
      <pointLight color="#ff0044" intensity={4} distance={45} decay={2} position={[-sx * 0.7, 4, sz * 0.7]} />
    </group>
  );
}
