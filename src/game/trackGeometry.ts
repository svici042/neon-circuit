export interface Point2 {
  x: number;
  z: number;
}

export interface RoundedRect {
  halfX: number;
  halfZ: number;
  radius: number;
}

export interface TrackGeometry {
  originalRoadWidth: number;
  roadWidth: number;
  centerHalfX: number;
  centerHalfZ: number;
  cornerRadius: number;
  outer: RoundedRect;
  inner: RoundedRect;
  wallThickness: number;
  wallHeight: number;
}

export interface MovementResult extends Point2 {
  collided: boolean;
}

export const CAR_COLLISION_RADIUS = 1.8;
export const CORNER_SEGMENTS = 12;

export function makeTrackGeometry(outerHalfX: number, outerHalfZ: number, originalRoadWidth: number): TrackGeometry {
  const roadWidth = originalRoadWidth * 2;
  const halfRoad = roadWidth / 2;
  const centerHalfX = outerHalfX - halfRoad;
  const centerHalfZ = outerHalfZ - halfRoad;
  if (centerHalfX <= halfRoad || centerHalfZ <= halfRoad) {
    throw new Error("Track is too small for its doubled road width");
  }
  const maxRadius = Math.min(centerHalfX, centerHalfZ) - 1;
  const cornerRadius = Math.min(maxRadius, Math.max(halfRoad + 2, Math.min(centerHalfX, centerHalfZ) * 0.55));
  return {
    originalRoadWidth,
    roadWidth,
    centerHalfX,
    centerHalfZ,
    cornerRadius,
    outer: {
      halfX: centerHalfX + halfRoad,
      halfZ: centerHalfZ + halfRoad,
      radius: cornerRadius + halfRoad,
    },
    inner: {
      halfX: centerHalfX - halfRoad,
      halfZ: centerHalfZ - halfRoad,
      radius: Math.max(0.5, cornerRadius - halfRoad),
    },
    wallThickness: 2,
    wallHeight: 2.2,
  };
}

export function roundedRectSignedDistance(point: Point2, rect: RoundedRect): number {
  const qx = Math.abs(point.x) - rect.halfX + rect.radius;
  const qz = Math.abs(point.z) - rect.halfZ + rect.radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  const inside = Math.min(Math.max(qx, qz), 0);
  return outside + inside - rect.radius;
}

export function isPointOnRoad(geometry: TrackGeometry, point: Point2, clearance = 0): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z) || clearance < 0) return false;
  return (
    roundedRectSignedDistance(point, geometry.outer) <= -clearance + 1e-7 &&
    roundedRectSignedDistance(point, geometry.inner) >= clearance - 1e-7
  );
}

export function roadClearance(geometry: TrackGeometry, point: Point2): number {
  const outerClearance = -roundedRectSignedDistance(point, geometry.outer);
  const innerClearance = roundedRectSignedDistance(point, geometry.inner);
  return Math.min(outerClearance, innerClearance);
}

function findLastLegalFraction(
  geometry: TrackGeometry,
  start: Point2,
  delta: Point2,
  radius: number,
): number {
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 12; iteration++) {
    const middle = (low + high) / 2;
    const candidate = { x: start.x + delta.x * middle, z: start.z + delta.z * middle };
    if (isPointOnRoad(geometry, candidate, radius)) low = middle;
    else high = middle;
  }
  return low;
}

function clearanceGradient(geometry: TrackGeometry, point: Point2): Point2 {
  const epsilon = 0.02;
  const dx = roadClearance(geometry, { x: point.x + epsilon, z: point.z }) -
    roadClearance(geometry, { x: point.x - epsilon, z: point.z });
  const dz = roadClearance(geometry, { x: point.x, z: point.z + epsilon }) -
    roadClearance(geometry, { x: point.x, z: point.z - epsilon });
  const length = Math.hypot(dx, dz);
  return length > 1e-8 ? { x: dx / length, z: dz / length } : { x: 0, z: 0 };
}

export function moveCircleOnRoad(
  geometry: TrackGeometry,
  start: Point2,
  delta: Point2,
  radius = CAR_COLLISION_RADIUS,
): MovementResult {
  if (!isPointOnRoad(geometry, start, radius)) {
    return { ...start, collided: true };
  }
  const distance = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(distance / Math.max(0.35, radius * 0.4)));
  const step = { x: delta.x / steps, z: delta.z / steps };
  let position = { ...start };
  let collided = false;

  for (let index = 0; index < steps; index++) {
    const candidate = { x: position.x + step.x, z: position.z + step.z };
    if (isPointOnRoad(geometry, candidate, radius)) {
      position = candidate;
      continue;
    }

    collided = true;
    const legalFraction = findLastLegalFraction(geometry, position, step, radius);
    position = {
      x: position.x + step.x * legalFraction,
      z: position.z + step.z * legalFraction,
    };

    const remaining = { x: step.x * (1 - legalFraction), z: step.z * (1 - legalFraction) };
    const gradient = clearanceGradient(geometry, position);
    const intoWall = remaining.x * gradient.x + remaining.z * gradient.z;
    const slide = intoWall < 0
      ? { x: remaining.x - gradient.x * intoWall, z: remaining.z - gradient.z * intoWall }
      : remaining;
    const slideFraction = findLastLegalFraction(geometry, position, slide, radius);
    position = {
      x: position.x + slide.x * slideFraction,
      z: position.z + slide.z * slideFraction,
    };
  }

  return { ...position, collided };
}

export function sampleRoundedRect(rect: RoundedRect, segmentsPerCorner = CORNER_SEGMENTS): Point2[] {
  const points: Point2[] = [];
  const corners = [
    { x: rect.halfX - rect.radius, z: rect.halfZ - rect.radius, start: Math.PI / 2, end: 0 },
    { x: rect.halfX - rect.radius, z: -rect.halfZ + rect.radius, start: 0, end: -Math.PI / 2 },
    { x: -rect.halfX + rect.radius, z: -rect.halfZ + rect.radius, start: -Math.PI / 2, end: -Math.PI },
    { x: -rect.halfX + rect.radius, z: rect.halfZ - rect.radius, start: Math.PI, end: Math.PI / 2 },
  ];
  for (const corner of corners) {
    for (let index = 0; index <= segmentsPerCorner; index++) {
      const angle = corner.start + (corner.end - corner.start) * (index / segmentsPerCorner);
      points.push({
        x: corner.x + Math.cos(angle) * rect.radius,
        z: corner.z + Math.sin(angle) * rect.radius,
      });
    }
  }
  return points;
}

export function isClosedLoop(points: Point2[]): boolean {
  if (points.length < 12) return false;
  return points.every((point, index) => {
    const next = points[(index + 1) % points.length];
    return Number.isFinite(point.x) && Number.isFinite(point.z) && Math.hypot(next.x - point.x, next.z - point.z) > 0;
  });
}

export function pointInRotatedRectangle(
  point: Point2,
  center: Point2,
  width: number,
  depth: number,
  rotationY = 0,
): boolean {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  const cosine = Math.cos(rotationY);
  const sine = Math.sin(rotationY);
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  return Math.abs(localX) <= width / 2 && Math.abs(localZ) <= depth / 2;
}

export function roundedRectSvgPath(rect: RoundedRect, scale: number): string {
  const halfX = rect.halfX * scale;
  const halfZ = rect.halfZ * scale;
  const radius = rect.radius * scale;
  return [
    `M ${-halfX + radius},${-halfZ}`,
    `H ${halfX - radius}`,
    `Q ${halfX},${-halfZ} ${halfX},${-halfZ + radius}`,
    `V ${halfZ - radius}`,
    `Q ${halfX},${halfZ} ${halfX - radius},${halfZ}`,
    `H ${-halfX + radius}`,
    `Q ${-halfX},${halfZ} ${-halfX},${halfZ - radius}`,
    `V ${-halfZ + radius}`,
    `Q ${-halfX},${-halfZ} ${-halfX + radius},${-halfZ}`,
    "Z",
  ].join(" ");
}
