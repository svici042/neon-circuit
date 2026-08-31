/**
 * Owns the React Three Fiber scene and the car state that changes every frame.
 * React manages scene objects, while refs store speed, heading, boost, lap
 * progress, and reusable vectors. Changing the track resets all mutable state.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import Track from "./Track";
import TouchControls from "./TouchControls";
import { controls, resetControls, setKeyboardControlsEnabled, setupKeyboardControls } from "./controls";
import { INITIAL_LAP_PROGRESS, updateLapProgress, type LapProgress } from "./lapDetection";
import { CAR_COLLISION_RADIUS, moveCircleOnRoad, pointInRotatedRectangle } from "./trackGeometry";
import type { TrackDef } from "./tracks";

const MAX_SPEED = 0.35;
const BOOST_SPEED = 0.55;
const ACCELERATION = 0.018;
const BRAKE_FORCE = 0.025;
const FRICTION = 0.008;
const TURN_SPEED = 0.038;
const BOOST_DURATION = 3000;

function isInBoostPad(x: number, z: number, pads: TrackDef["boostPads"]): boolean {
  return pads.some((pad) => pointInRotatedRectangle(
    { x, z },
    { x: pad.position[0], z: pad.position[2] },
    pad.size[0],
    pad.size[2],
    pad.rotationY,
  ));
}

interface CarProps {
  onLap: () => void;
  onBoostChange: (boosting: boolean) => void;
  onSpeedChange: (speed: number) => void;
  racing: boolean;
  trackDef: TrackDef;
}

function Car({ onLap, onBoostChange, onSpeedChange, racing, trackDef }: CarProps) {
  const carRef = useRef<THREE.Group>(null);
  const velocity = useRef(0);
  const rotationY = useRef(trackDef.carStart.rotationY);
  const boostRef = useRef(false);
  const boostEndRef = useRef(0);
  const lapProgressRef = useRef<LapProgress>(INITIAL_LAP_PROGRESS);
  const movementDirectionRef = useRef<THREE.Vector3 | null>(null);
  const cameraTargetRef = useRef<THREE.Vector3 | null>(null);
  if (movementDirectionRef.current === null) movementDirectionRef.current = new THREE.Vector3();
  if (cameraTargetRef.current === null) cameraTargetRef.current = new THREE.Vector3();

  const { camera } = useThree();

  useEffect(() => {
    if (!carRef.current) return;
    const { x, z, rotationY: ry } = trackDef.carStart;
    carRef.current.position.set(x, 0.75, z);
    rotationY.current = ry;
    velocity.current = 0;
    lapProgressRef.current = INITIAL_LAP_PROGRESS;
    boostRef.current = false;
    boostEndRef.current = 0;
    onBoostChange(false);
    onSpeedChange(0);
  }, [onBoostChange, onSpeedChange, trackDef]);

  useFrame((_, delta) => {
    if (!carRef.current || !racing) return;

    const dt = Math.min(delta, 0.05);
    const pos = carRef.current.position;
    const now = performance.now();

    // Restore the normal maximum speed when the boost duration expires.
    if (boostRef.current && now > boostEndRef.current) {
      boostRef.current = false;
      onBoostChange(false);
    }

    const topSpeed = boostRef.current ? BOOST_SPEED : MAX_SPEED;

    // Steering reads the shared keyboard, touch, or gyroscope control state.
    const speedFactor = Math.abs(velocity.current) / MAX_SPEED;
    const reverseDir = velocity.current < 0 ? -1 : 1;
    if (controls.left) rotationY.current += TURN_SPEED * speedFactor * reverseDir;
    if (controls.right) rotationY.current -= TURN_SPEED * speedFactor * reverseDir;

    // Apply acceleration, braking, and natural drag when no button is pressed.
    if (controls.forward) {
      velocity.current = Math.min(velocity.current + ACCELERATION, topSpeed);
    } else if (controls.backward) {
      if (velocity.current > 0) {
        velocity.current = Math.max(velocity.current - BRAKE_FORCE, 0);
      } else {
        velocity.current = Math.max(velocity.current - ACCELERATION * 0.6, -topSpeed * 0.4);
      }
    } else {
      if (velocity.current > 0) velocity.current = Math.max(velocity.current - FRICTION, 0);
      else if (velocity.current < 0) velocity.current = Math.min(velocity.current + FRICTION, 0);
    }

    onSpeedChange(velocity.current);

    const direction = movementDirectionRef.current!.set(
      -Math.sin(rotationY.current),
      0,
      -Math.cos(rotationY.current),
    );
    const previous = { x: pos.x, z: pos.z };
    const movement = moveCircleOnRoad(
      trackDef.geometry,
      previous,
      { x: direction.x * velocity.current * 60 * dt, z: direction.z * velocity.current * 60 * dt },
      CAR_COLLISION_RADIUS,
    );
    pos.x = movement.x;
    pos.z = movement.z;
    if (movement.collided) velocity.current *= 0.55;

    pos.y = 0.75;
    carRef.current.rotation.y = rotationY.current;

    // Driving over an active boost pad temporarily increases the speed limit.
    if (!boostRef.current && isInBoostPad(pos.x, pos.z, trackDef.boostPads)) {
      boostRef.current = true;
      boostEndRef.current = now + BOOST_DURATION;
      velocity.current = Math.min(velocity.current + 0.1, BOOST_SPEED);
      onBoostChange(true);
    }

    const lapUpdate = updateLapProgress(
      previous,
      { x: pos.x, z: pos.z },
      trackDef,
      lapProgressRef.current,
    );
    lapProgressRef.current = lapUpdate.progress;
    if (lapUpdate.lapCompleted) {
      onLap();
    }

    // Smoothly follow a point behind the car and look toward its travel direction.
    const cameraTarget = cameraTargetRef.current!.set(
      pos.x + Math.sin(rotationY.current) * 14,
      pos.y + 6,
      pos.z + Math.cos(rotationY.current) * 14,
    );
    camera.position.lerp(cameraTarget, 0.08);
    camera.lookAt(pos.x, 1.5, pos.z);
  });

  const accentColor = trackDef.accentColor;

  return (
    <group ref={carRef} position={[trackDef.carStart.x, 0.75, trackDef.carStart.z]}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.6, 0.55, 3.2]} />
        <meshStandardMaterial color="#cc0066" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.72, -0.3]}>
        <boxGeometry args={[1.0, 0.32, 1.5]} />
        <meshStandardMaterial color="#001133" roughness={0.1} metalness={0.9} transparent opacity={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.72, 1.3]}>
        <boxGeometry args={[1.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#cc0066" roughness={0.3} metalness={0.8} />
      </mesh>
      {([-0.9, 0.9] as number[]).flatMap((wx) =>
        ([-1.1, 1.1] as number[]).map((wz, i) => (
          <mesh key={`${wx}-${i}`} castShadow position={[wx, -0.15, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.3, 12]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        ))
      )}
      <pointLight color={accentColor} intensity={3} distance={5} decay={2} position={[0, -0.3, 0]} />
    </group>
  );
}

function Environment({ trackDef }: { trackDef: TrackDef }) {
  return (
    <>
      <ambientLight intensity={0.6} color="#8899ff" />
      <directionalLight position={[20, 30, 10]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-15, 20, -10]} intensity={0.5} color="#aaccff" />
      <fog attach="fog" args={[trackDef.fogColor, trackDef.fogNear, trackDef.fogFar]} />
    </>
  );
}

interface RacingGameProps {
  onLap: () => void;
  onBoostChange: (boosting: boolean) => void;
  onSpeedChange: (speed: number) => void;
  racing: boolean;
  trackDef: TrackDef;
  showTouchControls: boolean;
}

function KeyboardSetup() {
  useEffect(() => setupKeyboardControls(), []);
  return null;
}

export default function RacingGame({
  onLap,
  onBoostChange,
  onSpeedChange,
  racing,
  trackDef,
  showTouchControls,
}: RacingGameProps) {
  useEffect(() => {
    setKeyboardControlsEnabled(racing);
    if (!racing) resetControls();
    return () => setKeyboardControlsEnabled(false);
  }, [racing]);

  return (
    <>
      <KeyboardSetup />
      <Canvas
        shadows={false}
        camera={{ position: [10, 8, 78], fov: 75 }}
        style={{ width: "100%", height: "100%" }}
        dpr={1}
        gl={{
          antialias: false,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <Environment trackDef={trackDef} />
        <Track trackDef={trackDef} />
        <Car
          onLap={onLap}
          onBoostChange={onBoostChange}
          onSpeedChange={onSpeedChange}
          racing={racing}
          trackDef={trackDef}
        />
      </Canvas>
      <TouchControls
        accentColor={trackDef.accentColor}
        visible={showTouchControls && racing}
      />
    </>
  );
}
