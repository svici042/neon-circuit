/**
 * Builds the declarative Three.js scene for one immutable track definition.
 * Memoized BufferGeometry objects are attached to R3F meshes; React Three Fiber
 * owns and disposes them when a track replacement unmounts those attachments.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { BoostPad, TrackDef } from "./tracks";
import { sampleRoundedRect, type Point2, type RoundedRect } from "./trackGeometry";

const ROAD_COLOR = "#1a1a35";
const WALL_COLOR = "#080818";

function addQuad(positions: number[], indices: number[], a: number[], b: number[], c: number[], d: number[]): void {
  const base = positions.length / 3;
  positions.push(...a, ...b, ...c, ...d);
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function makeBandGeometry(outer: Point2[], inner: Point2[], bottom: number, top: number, sides: boolean): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < outer.length; index++) {
    const next = (index + 1) % outer.length;
    const o1 = outer[index];
    const o2 = outer[next];
    const i1 = inner[index];
    const i2 = inner[next];
    addQuad(positions, indices, [o1.x, top, o1.z], [o2.x, top, o2.z], [i2.x, top, i2.z], [i1.x, top, i1.z]);
    if (sides) {
      addQuad(positions, indices, [o1.x, bottom, o1.z], [o2.x, bottom, o2.z], [o2.x, top, o2.z], [o1.x, top, o1.z]);
      addQuad(positions, indices, [i2.x, bottom, i2.z], [i1.x, bottom, i1.z], [i1.x, top, i1.z], [i2.x, top, i2.z]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function offsetRect(rect: RoundedRect, amount: number): RoundedRect {
  return {
    halfX: rect.halfX + amount,
    halfZ: rect.halfZ + amount,
    radius: Math.max(0.25, rect.radius + amount),
  };
}

function BoundaryLine({ points, color, opacity = 1 }: { points: Point2[]; color: string; opacity?: number }) {
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setFromPoints(points.map((point) => new THREE.Vector3(point.x, 0.56, point.z)));
    return result;
  }, [points]);
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineLoop>
  );
}

function BoostPadMesh({ position, size, rotationY }: BoostPad) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={2} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <pointLight color="#ff6600" intensity={4} distance={8} decay={2} position={[0, 1, 0]} />
    </group>
  );
}

function StartFinishLine({ trackDef }: { trackDef: TrackDef }) {
  const { geometry, finish, accentColor } = trackDef;
  const z = (finish.zMin + finish.zMax) / 2;
  return (
    <group position={[finish.x, 0.57, z]}>
      <mesh>
        <boxGeometry args={[1.2, 0.05, geometry.roadWidth]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <pointLight color={accentColor} intensity={4} distance={12} decay={2} position={[0, 1, 0]} />
    </group>
  );
}

export default function Track({ trackDef }: { trackDef: TrackDef }) {
  const { accentColor, groundColor, boostPads, geometry } = trackDef;
  const meshes = useMemo(() => {
    const outer = sampleRoundedRect(geometry.outer);
    const inner = sampleRoundedRect(geometry.inner);
    const center = sampleRoundedRect({
      halfX: geometry.centerHalfX,
      halfZ: geometry.centerHalfZ,
      radius: geometry.cornerRadius,
    });
    const outerWallOutside = sampleRoundedRect(offsetRect(geometry.outer, geometry.wallThickness));
    const innerWallInside = sampleRoundedRect(offsetRect(geometry.inner, -geometry.wallThickness));
    return {
      outer,
      inner,
      center,
      road: makeBandGeometry(outer, inner, 0.48, 0.5, false),
      outerWall: makeBandGeometry(outerWallOutside, outer, 0.5, geometry.wallHeight, true),
      innerWall: makeBandGeometry(inner, innerWallInside, 0.5, geometry.wallHeight, true),
    };
  }, [geometry]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>

      <mesh geometry={meshes.road} receiveShadow>
        <meshStandardMaterial color={ROAD_COLOR} roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={meshes.outerWall} castShadow receiveShadow>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.6} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={meshes.innerWall} castShadow receiveShadow>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.6} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>

      <BoundaryLine points={meshes.outer} color={accentColor} />
      <BoundaryLine points={meshes.inner} color={accentColor} />
      <BoundaryLine points={meshes.center} color="#6688cc" opacity={0.28} />

      {boostPads.map((pad, index) => <BoostPadMesh key={index} {...pad} />)}
      <StartFinishLine trackDef={trackDef} />

      <pointLight color={accentColor} intensity={5} distance={55} decay={2} position={[geometry.outer.halfX * 0.7, 5, geometry.outer.halfZ * 0.7]} />
      <pointLight color={accentColor} intensity={5} distance={55} decay={2} position={[-geometry.outer.halfX * 0.7, 5, -geometry.outer.halfZ * 0.7]} />
      <pointLight color="#ff0044" intensity={4} distance={45} decay={2} position={[geometry.outer.halfX * 0.7, 4, -geometry.outer.halfZ * 0.7]} />
      <pointLight color="#ff0044" intensity={4} distance={45} decay={2} position={[-geometry.outer.halfX * 0.7, 4, geometry.outer.halfZ * 0.7]} />
    </group>
  );
}
