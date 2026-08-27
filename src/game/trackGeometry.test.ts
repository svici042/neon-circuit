import { describe, expect, it } from "vitest";
import {
  CAR_COLLISION_RADIUS,
  isClosedLoop,
  isPointOnRoad,
  isValidTrackGeometry,
  moveCircleOnRoad,
  sampleRoundedRect,
} from "./trackGeometry";
import { ORIGINAL_ROAD_WIDTHS, TRACKS, type BoostPad } from "./tracks";

function numbersIn(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(numbersIn);
  }
  return [];
}

function boostCorners(pad: BoostPad) {
  const halfWidth = pad.size[0] / 2;
  const halfDepth = pad.size[2] / 2;
  const cosine = Math.cos(pad.rotationY);
  const sine = Math.sin(pad.rotationY);
  return [-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => {
    const localX = halfWidth * xSign;
    const localZ = halfDepth * zSign;
    return {
      x: pad.position[0] + localX * cosine + localZ * sine,
      z: pad.position[2] - localX * sine + localZ * cosine,
    };
  }));
}

describe("rounded track definitions", () => {
  it("preserves ten tracks and doubles every original road width exactly", () => {
    expect(TRACKS).toHaveLength(10);
    TRACKS.forEach((track, index) => {
      expect(track.geometry.originalRoadWidth).toBe(ORIGINAL_ROAD_WIDTHS[index]);
      expect(track.geometry.roadWidth).toBe(ORIGINAL_ROAD_WIDTHS[index] * 2);
    });
  });

  it("provides finite, closed, rounded geometry for every track", () => {
    for (const track of TRACKS) {
      const { geometry } = track;
      expect(numbersIn(track).every(Number.isFinite)).toBe(true);
      expect(geometry.cornerRadius).toBeGreaterThan(0);
      expect(geometry.outer.radius).toBeGreaterThan(0);
      expect(geometry.inner.radius).toBeGreaterThan(0);
      expect(isClosedLoop(sampleRoundedRect(geometry.outer))).toBe(true);
      expect(isClosedLoop(sampleRoundedRect(geometry.inner))).toBe(true);
      expect(isValidTrackGeometry(geometry)).toBe(true);
      expect(sampleRoundedRect({
        halfX: geometry.centerHalfX,
        halfZ: geometry.centerHalfZ,
        radius: geometry.cornerRadius,
      }).every((point) => isPointOnRoad(geometry, point, CAR_COLLISION_RADIUS))).toBe(true);
      expect((track.previewSvg.outerPath.match(/Q/g) ?? [])).toHaveLength(4);
      expect((track.previewSvg.innerPath.match(/Q/g) ?? [])).toHaveLength(4);
    }
  });

  it("keeps starts, gates, and complete boost pads on their roads", () => {
    for (const track of TRACKS) {
      expect(isPointOnRoad(track.geometry, track.carStart, CAR_COLLISION_RADIUS)).toBe(true);
      for (const gate of [track.checkpoint, track.finish]) {
        expect(isPointOnRoad(track.geometry, { x: gate.x, z: (gate.zMin + gate.zMax) / 2 })).toBe(true);
      }
      for (const pad of track.boostPads) {
        expect(boostCorners(pad).every((corner) => isPointOnRoad(track.geometry, corner))).toBe(true);
      }
    }
  });

  it("rejects malformed loops and inverted track dimensions", () => {
    const points = sampleRoundedRect(TRACKS[0].geometry.outer);
    expect(isClosedLoop(points.slice(0, 3))).toBe(false);
    expect(isClosedLoop(points.map((point, index) => index === 4 ? { ...points[3] } : point))).toBe(false);
    expect(isClosedLoop(points.map((point, index) => index === 4 ? { x: Number.NaN, z: point.z } : point))).toBe(false);
    expect(isClosedLoop(points.map((point, index) => index === points.length - 1 ? { x: 10_000, z: 10_000 } : point))).toBe(false);

    const geometry = TRACKS[0].geometry;
    expect(isValidTrackGeometry({ ...geometry, roadWidth: -1 })).toBe(false);
    expect(isValidTrackGeometry({ ...geometry, inner: { ...geometry.outer } })).toBe(false);
    expect(() => sampleRoundedRect(geometry.outer, 0)).toThrow();
  });
});

describe("continuous car collision", () => {
  it.each(TRACKS.map((track) => [track.name, track] as const))(
    "%s blocks high-speed outer-wall and inner-wall tunneling",
    (_name, track) => {
      const start = { x: 0, z: track.geometry.centerHalfZ };
      const outerHit = moveCircleOnRoad(track.geometry, start, { x: 0, z: 500 }, CAR_COLLISION_RADIUS);
      const innerHit = moveCircleOnRoad(track.geometry, start, { x: 0, z: -500 }, CAR_COLLISION_RADIUS);
      expect(outerHit.collided).toBe(true);
      expect(innerHit.collided).toBe(true);
      expect(isPointOnRoad(track.geometry, outerHit, CAR_COLLISION_RADIUS)).toBe(true);
      expect(isPointOnRoad(track.geometry, innerHit, CAR_COLLISION_RADIUS)).toBe(true);
    },
  );

  it("blocks diagonal corner penetration during a large frame drop", () => {
    const track = TRACKS[0];
    const start = { x: 0, z: track.geometry.centerHalfZ };
    const result = moveCircleOnRoad(track.geometry, start, { x: 300, z: 300 }, CAR_COLLISION_RADIUS);
    expect(result.collided).toBe(true);
    expect(isPointOnRoad(track.geometry, result, CAR_COLLISION_RADIUS)).toBe(true);
  });

  it("blocks reverse movement through a wall", () => {
    const track = TRACKS[4];
    const start = { x: 0, z: track.geometry.centerHalfZ };
    const result = moveCircleOnRoad(track.geometry, start, { x: 0, z: -250 }, CAR_COLLISION_RADIUS);
    expect(result.collided).toBe(true);
    expect(isPointOnRoad(track.geometry, result, CAR_COLLISION_RADIUS)).toBe(true);
  });

  it("preserves tangential motion as wall sliding", () => {
    const track = TRACKS[0];
    const halfRoad = track.geometry.roadWidth / 2;
    const start = {
      x: -8,
      z: track.geometry.centerHalfZ + halfRoad - CAR_COLLISION_RADIUS - 0.05,
    };
    const result = moveCircleOnRoad(track.geometry, start, { x: 12, z: 5 }, CAR_COLLISION_RADIUS);
    expect(result.collided).toBe(true);
    expect(result.x).toBeGreaterThan(start.x + 5);
    expect(isPointOnRoad(track.geometry, result, CAR_COLLISION_RADIUS)).toBe(true);
  });
});
