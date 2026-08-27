/**
 * Ten immutable authored track themes flow through one rounded-rectangle
 * factory. Dimensions are X/Z half-extents in world units; original widths are
 * retained alongside the required doubled road widths for regression checks.
 */
import { makeTrackGeometry, roundedRectSvgPath, type TrackGeometry } from "./trackGeometry";

export interface BoostPad {
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
}

export interface TrackGate {
  x: number;
  zMin: number;
  zMax: number;
  direction: -1 | 1;
}

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
  geometry: TrackGeometry;
  boostPads: BoostPad[];
  carStart: { x: number; z: number; rotationY: number };
  checkpoint: TrackGate;
  finish: TrackGate;
  previewSvg: { viewBox: string; outerPath: string; innerPath: string };
}

type TrackSide = "top" | "right" | "bottom" | "left";

interface TrackMeta {
  id: number;
  name: string;
  difficulty: TrackDef["difficulty"];
  description: string;
  accentColor: string;
  groundColor: string;
  fogColor: string;
  fogNear?: number;
  fogFar?: number;
  extraBoosts?: Array<{ side: TrackSide; offset: number }>;
}

function boostForStraight(geometry: TrackGeometry, side: TrackSide, offset: number): BoostPad {
  const straightHalfX = geometry.centerHalfX - geometry.cornerRadius;
  const straightHalfZ = geometry.centerHalfZ - geometry.cornerRadius;
  const along = Math.min(7, geometry.roadWidth * 0.35);
  const across = Math.min(6, geometry.roadWidth * 0.35);
  if (side === "top" || side === "bottom") {
    return {
      position: [offset * straightHalfX, 0.53, side === "top" ? geometry.centerHalfZ : -geometry.centerHalfZ],
      size: [along, 0.1, across],
      rotationY: 0,
    };
  }
  return {
    position: [side === "right" ? geometry.centerHalfX : -geometry.centerHalfX, 0.53, offset * straightHalfZ],
    size: [along, 0.1, across],
    rotationY: Math.PI / 2,
  };
}

/** Derives every gameplay, render, gate, boost, and preview value from one validated geometry. */
export function makeRoundedTrack(outerHalfX: number, outerHalfZ: number, originalRoadWidth: number, meta: TrackMeta): TrackDef {
  const geometry = makeTrackGeometry(outerHalfX, outerHalfZ, originalRoadWidth);
  const scale = 38 / Math.max(geometry.outer.halfX, geometry.outer.halfZ);
  const defaultBoosts: BoostPad[] = [
    boostForStraight(geometry, "top", 0),
    boostForStraight(geometry, "right", 0),
    boostForStraight(geometry, "bottom", 0),
    boostForStraight(geometry, "left", 0),
  ];
  const extraBoosts = (meta.extraBoosts ?? []).map(({ side, offset }) => boostForStraight(geometry, side, offset));
  const startOffset = Math.min(geometry.roadWidth * 0.35, (geometry.centerHalfX - geometry.cornerRadius) * 0.45);

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
    geometry,
    boostPads: [...defaultBoosts, ...extraBoosts],
    carStart: { x: startOffset, z: geometry.centerHalfZ, rotationY: Math.PI / 2 },
    checkpoint: {
      x: 0,
      zMin: -geometry.outer.halfZ,
      zMax: -geometry.inner.halfZ,
      direction: 1,
    },
    finish: {
      x: 0,
      zMin: geometry.inner.halfZ,
      zMax: geometry.outer.halfZ,
      direction: -1,
    },
    previewSvg: {
      viewBox: "-42 -62 84 124",
      outerPath: roundedRectSvgPath(geometry.outer, scale),
      innerPath: roundedRectSvgPath(geometry.inner, scale),
    },
  };
}

export const ORIGINAL_ROAD_WIDTHS = [12, 10, 10, 16, 7, 12, 9, 12, 11, 6] as const;

export const TRACKS: TrackDef[] = [
  makeRoundedTrack(40, 70, ORIGINAL_ROAD_WIDTHS[0], {
    id: 1, name: "Neon Oval", difficulty: "Easy",
    description: "Classic balanced oval. Perfect for beginners.",
    accentColor: "#00eeff", groundColor: "#0a0a20", fogColor: "#0a0a2a",
  }),
  makeRoundedTrack(55, 95, ORIGINAL_ROAD_WIDTHS[1], {
    id: 2, name: "The Bullet", difficulty: "Easy",
    description: "Extremely elongated track. Reach maximum speed on long straights.",
    accentColor: "#ffee00", groundColor: "#0a0a10", fogColor: "#0a0a15", fogNear: 100, fogFar: 280,
    extraBoosts: [{ side: "top", offset: 0.55 }, { side: "bottom", offset: -0.55 }],
  }),
  makeRoundedTrack(35, 46, ORIGINAL_ROAD_WIDTHS[2], {
    id: 3, name: "City Crunch", difficulty: "Medium",
    description: "Compact city-block circuit. Every corner counts.",
    accentColor: "#ff6600", groundColor: "#0d0a00", fogColor: "#150a00", fogNear: 50, fogFar: 160,
  }),
  makeRoundedTrack(58, 82, ORIGINAL_ROAD_WIDTHS[3], {
    id: 4, name: "Grand Prix", difficulty: "Easy",
    description: "Sweeping wide roads. High-speed and forgiving.",
    accentColor: "#00ff88", groundColor: "#001408", fogColor: "#00180a", fogNear: 90, fogFar: 250,
    extraBoosts: [{ side: "top", offset: 0.55 }, { side: "bottom", offset: -0.55 }],
  }),
  makeRoundedTrack(40, 62, ORIGINAL_ROAD_WIDTHS[4], {
    id: 5, name: "The Needle", difficulty: "Hard",
    description: "Dangerously narrow track. One mistake and you're in the wall.",
    accentColor: "#ff0044", groundColor: "#140008", fogColor: "#1a0008", fogNear: 60, fogFar: 180,
    extraBoosts: [{ side: "top", offset: 0.55 }],
  }),
  makeRoundedTrack(45, 55, ORIGINAL_ROAD_WIDTHS[5], {
    id: 6, name: "Midnight Loop", difficulty: "Medium",
    description: "Shorter track with tight exits. Smooth and hypnotic.",
    accentColor: "#cc00ff", groundColor: "#0a0014", fogColor: "#0a0018", fogNear: 70, fogFar: 200,
  }),
  makeRoundedTrack(28, 38, ORIGINAL_ROAD_WIDTHS[6], {
    id: 7, name: "Kart Circuit", difficulty: "Medium",
    description: "Tiny but intense. Master the micro-track.",
    accentColor: "#ff44cc", groundColor: "#140014", fogColor: "#180014", fogNear: 40, fogFar: 140,
  }),
  makeRoundedTrack(50, 78, ORIGINAL_ROAD_WIDTHS[7], {
    id: 8, name: "Glacier Run", difficulty: "Medium",
    description: "Large frozen circuit. Ice-blue atmosphere, smooth rhythm.",
    accentColor: "#aaddff", groundColor: "#000a14", fogColor: "#000a1a", fogNear: 80, fogFar: 230,
    extraBoosts: [{ side: "top", offset: 0.55 }, { side: "bottom", offset: -0.55 }],
  }),
  makeRoundedTrack(42, 66, ORIGINAL_ROAD_WIDTHS[8], {
    id: 9, name: "Power Surge", difficulty: "Easy",
    description: "Boost pads everywhere! Unleash maximum speed.",
    accentColor: "#ffd700", groundColor: "#100800", fogColor: "#140a00", fogNear: 75, fogFar: 210,
    extraBoosts: [
      { side: "top", offset: 0.58 }, { side: "top", offset: -0.58 },
      { side: "bottom", offset: 0.58 }, { side: "bottom", offset: -0.58 },
    ],
  }),
  makeRoundedTrack(38, 56, ORIGINAL_ROAD_WIDTHS[9], {
    id: 10, name: "Nightmare", difficulty: "Expert",
    description: "Razor-thin roads, no margin for error. Only legends finish.",
    accentColor: "#ff2200", groundColor: "#100000", fogColor: "#140000", fogNear: 55, fogFar: 160,
  }),
];
