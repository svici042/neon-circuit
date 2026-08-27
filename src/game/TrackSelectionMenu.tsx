import type { CSSProperties } from "react";
import { hexToRgb } from "./color";
import { TRACKS, type TrackDef } from "./tracks";

const DIFFICULTY_COLORS: Record<TrackDef["difficulty"], string> = {
  Easy: "#00ff88",
  Medium: "#ffcc00",
  Hard: "#ff6600",
  Expert: "#ff0044",
};

function TrackPreview({ trackDef, selected }: { trackDef: TrackDef; selected: boolean }) {
  const { previewSvg, accentColor, difficulty } = trackDef;
  return (
    <svg viewBox={previewSvg.viewBox} width="100%" height="100%" style={{ display: "block" }}>
      <path
        d={previewSvg.outerPath}
        fill={selected ? `${accentColor}22` : "#ffffff08"}
        stroke={selected ? accentColor : "#ffffff22"}
        strokeWidth={selected ? 1.5 : 1}
      />
      <path d={previewSvg.innerPath} fill={selected ? "#00000088" : "#00000055"} stroke="none" />
      <circle cx={0} cy={38} r={3} fill={selected ? accentColor : "#ffffff44"} />
      <circle cx={36} cy={-52} r={4} fill={DIFFICULTY_COLORS[difficulty]} />
    </svg>
  );
}

function TrackCard({ trackDef, selected, onClick }: {
  trackDef: TrackDef;
  selected: boolean;
  onClick: () => void;
}) {
  const { name, difficulty, accentColor } = trackDef;
  const difficultyColor = DIFFICULTY_COLORS[difficulty];
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        background: selected ? `rgba(${hexToRgb(accentColor)}, 0.1)` : "rgba(0,0,0,0.35)",
        border: `1.5px solid ${selected ? accentColor : "#ffffff18"}`,
        borderRadius: 10,
        padding: "10px 8px 8px",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.15s",
        boxShadow: selected ? `0 0 16px ${accentColor}44` : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div style={{ width: 70, height: 90 }}><TrackPreview trackDef={trackDef} selected={selected} /></div>
      <div style={{ fontSize: 11, fontWeight: "bold", color: selected ? accentColor : "#ffffffaa", letterSpacing: 0.5, lineHeight: 1.2 }}>
        {name}
      </div>
      <div style={{ fontSize: 9, color: difficultyColor, letterSpacing: 1, border: `1px solid ${difficultyColor}55`, borderRadius: 3, padding: "1px 5px" }}>
        {difficulty.toUpperCase()}
      </div>
    </button>
  );
}

interface TrackSelectionMenuProps {
  selectedTrack: TrackDef;
  isTouchDevice: boolean;
  totalLaps: number;
  onSelect: (track: TrackDef) => void;
  onStart: () => void;
}

export default function TrackSelectionMenu({ selectedTrack, isTouchDevice, totalLaps, onSelect, onStart }: TrackSelectionMenuProps) {
  const accent = selectedTrack.accentColor;
  const difficultyColor = DIFFICULTY_COLORS[selectedTrack.difficulty];
  return (
    <div className="game-overlay track-selection" style={{ "--accent": accent } as CSSProperties}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 5, color: `${accent}99`, marginBottom: 8 }}>FUTURISTIC RACING LEAGUE</div>
        <h1 style={{ fontSize: "clamp(36px, 7vw, 64px)", fontWeight: "bold", color: accent, textShadow: `0 0 30px ${accent}, 0 0 60px ${accent}66`, margin: 0, letterSpacing: 2, lineHeight: 1.1 }}>
          NEON CIRCUIT
        </h1>
      </div>

      <div style={{ width: "100%", maxWidth: 740, marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffffff44", textAlign: "center", marginBottom: 12 }}>SELECT TRACK</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(clamp(90px, 15vw, 140px), 1fr))", gap: "clamp(5px, 1vw, 8px)" }}>
          {TRACKS.map((track) => (
            <TrackCard key={track.id} trackDef={track} selected={selectedTrack.id === track.id} onClick={() => onSelect(track)} />
          ))}
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 740, background: `rgba(${hexToRgb(accent)}, 0.06)`, border: `1px solid ${accent}33`, borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}`, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
            {selectedTrack.name}
            <span style={{ marginLeft: 10, fontSize: 10, color: difficultyColor, border: `1px solid ${difficultyColor}55`, borderRadius: 3, padding: "2px 6px" }}>
              {selectedTrack.difficulty.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#ffffff66", marginTop: 3 }}>{selectedTrack.description}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: "#ffffff44" }}>{totalLaps} LAPS</div>
      </div>

      <button type="button" onClick={onStart} className="start-race-button">START RACE</button>
      <div style={{ fontSize: 11, color: "#ffffff28", letterSpacing: 1, textAlign: "center" }}>
        {isTouchDevice
          ? "Laikykite ▲ — gas · ▼ — stabdžiai · ◀ ▶ — vairavimas · Oranžiniai plotai = greičio impulsas"
          : "W / ↑ \u00a0Accelerate \u00a0·\u00a0 S / ↓ \u00a0Brake \u00a0·\u00a0 A / ← \u00a0D / → \u00a0Steer \u00a0·\u00a0 Orange pads = Speed boost"}
      </div>
    </div>
  );
}
