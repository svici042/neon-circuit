export interface TrackSegment {
  pos: [number, number, number];
  size: [number, number, number];
}

export interface BoostPad {
  position: [number, number, number];
  size: [number, number, number];
}

// [xMin, xMax, zMin, zMax]
export type CollisionZone = [number, number, number, number];

export interface TrackDef {
  id: number;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  description: string;
  accentColor: string;
  groundColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  roads: TrackSegment[];
  outerWalls: TrackSegment[];
  innerWalls: TrackSegment[];
  boostPads: BoostPad[];
  collisionZones: CollisionZone[];
  carStart: { x: number; z: number; rotationY: number };
  checkpoint: CollisionZone;
  finish: { zMin: number; zMax: number };
  // SVG viewBox & path for mini preview
  previewSvg: { viewBox: string; outerPath: string; innerPath: string };
}

function makeOval(
  sx: number,
  sz: number,
  rw: number,
  meta: {
    id: number;
    name: string;
    difficulty: TrackDef["difficulty"];
    description: string;
    accentColor: string;
    groundColor: string;
    fogColor: string;
    fogNear?: number;
    fogFar?: number;
    extraBoosts?: BoostPad[];
  }
): TrackDef {
  const roadY = 0.25;
  const roadH = 0.5;
  const wallH = 2.2;
  const wallY = wallH / 2;

  // Road mesh segments
  const roads: TrackSegment[] = [
    { pos: [0, roadY, sz - rw / 2], size: [2 * sx, roadH, rw] },
    { pos: [0, roadY, -(sz - rw / 2)], size: [2 * sx, roadH, rw] },
    { pos: [sx - rw / 2, roadY, 0], size: [rw, roadH, 2 * (sz - rw)] },
    { pos: [-(sx - rw / 2), roadY, 0], size: [rw, roadH, 2 * (sz - rw)] },
  ];

  // Collision zones
  const collisionZones: CollisionZone[] = [
    [-sx, sx, sz - rw, sz],
    [-sx, sx, -sz, -(sz - rw)],
    [sx - rw, sx, -(sz - rw), sz - rw],
    [-sx, -(sx - rw), -(sz - rw), sz - rw],
  ];

  // Outer walls
  const outerWalls: TrackSegment[] = [
    { pos: [0, wallY, sz + 1], size: [2 * sx + 4, wallH, 2] },
    { pos: [0, wallY, -(sz + 1)], size: [2 * sx + 4, wallH, 2] },
    { pos: [sx + 1, wallY, 0], size: [2, wallH, 2 * sz + 4] },
    { pos: [-(sx + 1), wallY, 0], size: [2, wallH, 2 * sz + 4] },
  ];

  // Inner walls
  const iw = sx - rw;
  const ih = sz - rw;
  const innerWalls: TrackSegment[] = [
    { pos: [0, wallY, ih + 1], size: [2 * iw - 2, wallH, 2] },
    { pos: [0, wallY, -(ih + 1)], size: [2 * iw - 2, wallH, 2] },
    { pos: [iw + 1, wallY, 0], size: [2, wallH, 2 * ih - 2] },
    { pos: [-(iw + 1), wallY, 0], size: [2, wallH, 2 * ih - 2] },
  ];

  // Default boost pads: center of each straight
  const padW = Math.min(rw * 0.5, 7);
  const padD = Math.min(rw * 0.4, 5);
  const defaultBoosts: BoostPad[] = [
    { position: [0, 0.28, sz - rw / 2], size: [padW, 0.1, padD] },
    { position: [0, 0.28, -(sz - rw / 2)], size: [padW, 0.1, padD] },
    { position: [sx - rw / 2, 0.28, 0], size: [padD, 0.1, padW] },
    { position: [-(sx - rw / 2), 0.28, 0], size: [padD, 0.1, padW] },
  ];

  const boostPads = [...defaultBoosts, ...(meta.extraBoosts ?? [])];

  const carStart = { x: rw / 3, z: sz - rw / 2, rotationY: Math.PI / 2 };
  const checkpoint: CollisionZone = [-sx, sx, -sz, -(sz - rw)];
  const finish = { zMin: sz - rw - 1, zMax: sz + 1 };

  // Mini SVG preview (normalized to 40x60 units)
  const sc = 38 / Math.max(sx, sz);
  const ox = sx * sc;
  const oz = sz * sc;
  const irw = rw * sc;
  const outerPath = `M ${-ox},${-oz} L ${ox},${-oz} L ${ox},${oz} L ${-ox},${oz} Z`;
  const innerPath = `M ${-(ox - irw)},${-(oz - irw)} L ${ox - irw},${-(oz - irw)} L ${ox - irw},${oz - irw} L ${-(ox - irw)},${oz - irw} Z`;

  return {
    id: meta.id,
    name: meta.name,
    difficulty: meta.difficulty,
    description: meta.description,
    accentColor: meta.accentColor,
    groundColor: meta.groundColor,
    fogColor: meta.fogColor,
    fogNear: meta.fogNear ?? 80,
    fogFar: meta.fogFar ?? 220,
    roads,
    outerWalls,
    innerWalls,
    boostPads,
    collisionZones,
    carStart,
    checkpoint,
    finish,
    previewSvg: {
      viewBox: "-42 -62 84 124",
      outerPath,
      innerPath,
    },
  };
}

export const TRACKS: TrackDef[] = [
  makeOval(40, 70, 12, {
    id: 1,
    name: "Neon Oval",
    difficulty: "Easy",
    description: "Classic balanced oval. Perfect for beginners.",
    accentColor: "#00eeff",
    groundColor: "#0a0a20",
    fogColor: "#0a0a2a",
  }),

  makeOval(55, 95, 10, {
    id: 2,
    name: "The Bullet",
    difficulty: "Easy",
    description: "Extremely elongated track. Reach maximum speed on long straights.",
    accentColor: "#ffee00",
    groundColor: "#0a0a10",
    fogColor: "#0a0a15",
    fogNear: 100,
    fogFar: 280,
    extraBoosts: [
      { position: [20, 0.28, 90], size: [5, 0.1, 7] },
      { position: [-20, 0.28, -90], size: [5, 0.1, 7] },
    ],
  }),

  makeOval(35, 46, 10, {
    id: 3,
    name: "City Crunch",
    difficulty: "Medium",
    description: "Compact city-block circuit. Every corner counts.",
    accentColor: "#ff6600",
    groundColor: "#0d0a00",
    fogColor: "#150a00",
    fogNear: 50,
    fogFar: 160,
  }),

  makeOval(58, 82, 16, {
    id: 4,
    name: "Grand Prix",
    difficulty: "Easy",
    description: "Sweeping wide roads. High-speed and forgiving.",
    accentColor: "#00ff88",
    groundColor: "#001408",
    fogColor: "#00180a",
    fogNear: 90,
    fogFar: 250,
    extraBoosts: [
      { position: [30, 0.28, 77], size: [8, 0.1, 8] },
      { position: [-30, 0.28, -77], size: [8, 0.1, 8] },
    ],
  }),

  makeOval(40, 62, 7, {
    id: 5,
    name: "The Needle",
    difficulty: "Hard",
    description: "Dangerously narrow track. One mistake and you're in the wall.",
    accentColor: "#ff0044",
    groundColor: "#140008",
    fogColor: "#1a0008",
    fogNear: 60,
    fogFar: 180,
    extraBoosts: [
      { position: [0, 0.28, 40], size: [4, 0.1, 4] },
    ],
  }),

  makeOval(45, 55, 12, {
    id: 6,
    name: "Midnight Loop",
    difficulty: "Medium",
    description: "Shorter track with tight exits. Smooth and hypnotic.",
    accentColor: "#cc00ff",
    groundColor: "#0a0014",
    fogColor: "#0a0018",
    fogNear: 70,
    fogFar: 200,
  }),

  makeOval(28, 38, 9, {
    id: 7,
    name: "Kart Circuit",
    difficulty: "Medium",
    description: "Tiny but intense. Master the micro-track.",
    accentColor: "#ff44cc",
    groundColor: "#140014",
    fogColor: "#180014",
    fogNear: 40,
    fogFar: 140,
  }),

  makeOval(50, 78, 12, {
    id: 8,
    name: "Glacier Run",
    difficulty: "Medium",
    description: "Large frozen circuit. Ice-blue atmosphere, smooth rhythm.",
    accentColor: "#aaddff",
    groundColor: "#000a14",
    fogColor: "#000a1a",
    fogNear: 80,
    fogFar: 230,
    extraBoosts: [
      { position: [28, 0.28, 73], size: [7, 0.1, 6] },
      { position: [-28, 0.28, -73], size: [7, 0.1, 6] },
    ],
  }),

  makeOval(42, 66, 11, {
    id: 9,
    name: "Power Surge",
    difficulty: "Easy",
    description: "Boost pads everywhere! Unleash maximum speed.",
    accentColor: "#ffd700",
    groundColor: "#100800",
    fogColor: "#140a00",
    fogNear: 75,
    fogFar: 210,
    extraBoosts: [
      { position: [25, 0.28, 61], size: [6, 0.1, 5] },
      { position: [-25, 0.28, 61], size: [6, 0.1, 5] },
      { position: [25, 0.28, -61], size: [6, 0.1, 5] },
      { position: [-25, 0.28, -61], size: [6, 0.1, 5] },
    ],
  }),

  makeOval(38, 56, 6, {
    id: 10,
    name: "Nightmare",
    difficulty: "Expert",
    description: "Razor-thin roads, no margin for error. Only legends finish.",
    accentColor: "#ff2200",
    groundColor: "#100000",
    fogColor: "#140000",
    fogNear: 55,
    fogFar: 160,
  }),
];
