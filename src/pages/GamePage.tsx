import { useState, useRef, useCallback, useEffect } from "react";
import RacingGame from "@/game/RacingGame";
import HUD from "@/game/HUD";
import Leaderboard, { LeaderboardEntry } from "@/game/Leaderboard";
import ErrorBoundary from "@/game/ErrorBoundary";
import { TRACKS, type TrackDef } from "@/game/tracks";
import { AudioEngine } from "@/game/AudioEngine";

const TOTAL_LAPS = 3;
const STORAGE_KEY = "futuristic-racing-leaderboard-v2";

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

type GameState = "menu" | "countdown" | "racing" | "finished";

interface PauseMenuProps {
  accentColor: string;
  onResume: () => void;
  onRestart: () => void;
  onChangeTrack: () => void;
  onCancel: () => void;
}

function PauseMenu({ accentColor, onResume, onRestart, onChangeTrack, onCancel }: PauseMenuProps) {
  const btn = (label: string, onClick: () => void, primary = false) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "13px",
        background: primary ? accentColor : "transparent",
        border: `1.5px solid ${primary ? accentColor : "#ffffff33"}`,
        borderRadius: 7,
        color: primary ? "#000" : "#ffffffcc",
        fontSize: 14,
        fontWeight: primary ? "bold" : "normal",
        letterSpacing: 2,
        cursor: "pointer",
        fontFamily: "'Courier New', monospace",
        boxShadow: primary ? `0 0 20px ${accentColor}55` : "none",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = primary ? accentColor : "#ffffff18";
        el.style.borderColor = primary ? accentColor : "#ffffff66";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = primary ? accentColor : "transparent";
        el.style.borderColor = primary ? accentColor : "#ffffff33";
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,16,0.78)",
        zIndex: 20,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          width: 320,
          background: "rgba(4,4,28,0.97)",
          border: `1px solid ${accentColor}44`,
          borderRadius: 14,
          padding: "32px 28px",
          boxShadow: `0 0 50px ${accentColor}22`,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            letterSpacing: 4,
            color: accentColor,
            marginBottom: 6,
            textShadow: `0 0 12px ${accentColor}`,
          }}
        >
          ⏸ PAUZĖ
        </div>

        {btn("▶  PRATĘSTI LENKTYNES", onResume, true)}
        {btn("↺  GRĮŽTI Į PRADŽIĄ", onRestart)}
        {btn("⇄  PAKEISTI TRASĄ", onChangeTrack)}
        {btn("✕  ATŠAUKTI LENKTYNES", onCancel)}

        <div style={{ textAlign: "center", fontSize: 10, color: "#ffffff28", marginTop: 4 }}>
          ESC — tęsti
        </div>
      </div>
    </div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#00ff88",
  Medium: "#ffcc00",
  Hard: "#ff6600",
  Expert: "#ff0044",
};

function TrackPreview({ trackDef, selected }: { trackDef: TrackDef; selected: boolean }) {
  const { previewSvg, accentColor, difficulty } = trackDef;
  const diffColor = DIFFICULTY_COLORS[difficulty];

  return (
    <svg
      viewBox={previewSvg.viewBox}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      {/* Outer track shape */}
      <path
        d={previewSvg.outerPath}
        fill={selected ? accentColor + "22" : "#ffffff08"}
        stroke={selected ? accentColor : "#ffffff22"}
        strokeWidth={selected ? 1.5 : 1}
      />
      {/* Inner infield */}
      <path
        d={previewSvg.innerPath}
        fill={selected ? "#00000088" : "#00000055"}
        stroke="none"
      />
      {/* Start line dot */}
      <circle cx={0} cy={38} r={3} fill={selected ? accentColor : "#ffffff44"} />
      {/* Difficulty dot */}
      <circle cx={36} cy={-52} r={4} fill={diffColor} />
    </svg>
  );
}

function TrackCard({
  trackDef,
  selected,
  onClick,
}: {
  trackDef: TrackDef;
  selected: boolean;
  onClick: () => void;
}) {
  const { name, difficulty, accentColor } = trackDef;
  const diffColor = DIFFICULTY_COLORS[difficulty];

  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? `rgba(${hexToRgb(accentColor)}, 0.1)` : "rgba(0,0,0,0.35)",
        border: `1.5px solid ${selected ? accentColor : "#ffffff18"}`,
        borderRadius: 10,
        padding: "10px 8px 8px",
        cursor: "pointer",
        fontFamily: "'Courier New', monospace",
        textAlign: "center",
        transition: "all 0.15s",
        boxShadow: selected ? `0 0 16px ${accentColor}44` : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      {/* Mini track preview */}
      <div style={{ width: 70, height: 90 }}>
        <TrackPreview trackDef={trackDef} selected={selected} />
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: selected ? accentColor : "#ffffffaa",
          letterSpacing: 0.5,
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>

      <div
        style={{
          fontSize: 9,
          color: diffColor,
          letterSpacing: 1,
          border: `1px solid ${diffColor}55`,
          borderRadius: 3,
          padding: "1px 5px",
        }}
      >
        {difficulty.toUpperCase()}
      </div>
    </button>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0,238,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [paused, setPaused] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackDef>(TRACKS[0]);
  const [countdown, setCountdown] = useState(3);
  const [currentLap, setCurrentLap] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [lastLapTime, setLastLapTime] = useState<number | null>(null);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard);
  const [latestEntry, setLatestEntry] = useState<LeaderboardEntry | undefined>();
  const [isTouchDevice] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [muted, setMuted] = useState(false);

  const raceStartRef = useRef<number>(0);
  const lapStartRef = useRef<number>(0);
  const lapTimesRef = useRef<number[]>([]);
  const audioRef = useRef<AudioEngine>(new AudioEngine());
  const rafRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);

  // Timer tick — stops when paused
  useEffect(() => {
    if (gameState !== "racing" || paused) return;
    const tick = () => {
      const now = Date.now();
      setLapTime(now - lapStartRef.current);
      setTotalTime(now - raceStartRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, paused]);

  // ESC key toggles pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && gameState === "racing") {
        setPaused((p) => {
          if (!p) {
            pauseStartRef.current = Date.now();
          } else {
            const elapsed = Date.now() - pauseStartRef.current;
            lapStartRef.current += elapsed;
            raceStartRef.current += elapsed;
          }
          return !p;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState]);

  // Pause/resume audio with game pause
  useEffect(() => {
    if (gameState !== "racing") return;
    if (paused) {
      audioRef.current.pauseAudio();
    } else {
      audioRef.current.resumeAudio();
    }
  }, [paused, gameState]);

  const startCountdown = useCallback(() => {
    audioRef.current.init();
    audioRef.current.stopMusic();
    audioRef.current.startMusic();

    setGameState("countdown");
    setCountdown(3);
    setCurrentLap(0);
    setLapTime(0);
    setLastLapTime(null);
    setBestLapTime(null);
    setTotalTime(0);
    setSpeed(0);
    setBoosting(false);
    lapTimesRef.current = [];

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(0);
        const now = Date.now();
        raceStartRef.current = now;
        lapStartRef.current = now;
        setGameState("racing");
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, []);

  const handleLap = useCallback(
    (lapTimeMs: number) => {
      setCurrentLap((prev) => {
        const newLap = prev + 1;
        lapTimesRef.current.push(lapTimeMs);
        setLastLapTime(lapTimeMs);
        setBestLapTime((best) => (best === null ? lapTimeMs : Math.min(best, lapTimeMs)));
        lapStartRef.current = Date.now();

        if (newLap >= TOTAL_LAPS) {
          setTimeout(() => {
            audioRef.current.stopMusic();
            audioRef.current.stopEngine();
            const totalRaceTime = Date.now() - raceStartRef.current;
            const allLaps = lapTimesRef.current;
            const best = allLaps.length > 0 ? Math.min(...allLaps) : totalRaceTime;
            const entry: LeaderboardEntry = {
              name: selectedTrack.name,
              totalTime: totalRaceTime,
              bestLap: best,
              date: new Date().toLocaleDateString(),
            };
            setLatestEntry(entry);
            setLeaderboard((prev) => {
              const updated = [...prev, entry];
              saveLeaderboard(updated);
              return updated;
            });
            setGameState("finished");
          }, 500);
        }
        return newLap;
      });
    },
    [selectedTrack]
  );

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    audioRef.current.setSpeed(s);
  }, []);

  const handleBoostChange = useCallback((b: boolean) => {
    setBoosting(b);
    if (b) audioRef.current.playBoost();
  }, []);

  const handlePause = useCallback(() => {
    setPaused((p) => {
      if (!p) pauseStartRef.current = Date.now();
      else {
        const elapsed = Date.now() - pauseStartRef.current;
        lapStartRef.current += elapsed;
        raceStartRef.current += elapsed;
      }
      return !p;
    });
  }, []);

  const handleResume = useCallback(() => {
    const elapsed = Date.now() - pauseStartRef.current;
    lapStartRef.current += elapsed;
    raceStartRef.current += elapsed;
    setPaused(false);
  }, []);

  const handleRestart = useCallback(() => {
    setPaused(false);
    startCountdown();
  }, [startCountdown]);

  const handleChangeTrack = useCallback(() => {
    setPaused(false);
    audioRef.current.stopMusic();
    audioRef.current.stopEngine();
    audioRef.current.resumeAudio();
    setGameState("menu");
  }, []);

  const handleCancel = useCallback(() => {
    setPaused(false);
    audioRef.current.stopMusic();
    audioRef.current.stopEngine();
    audioRef.current.resumeAudio();
    setGameState("menu");
  }, []);

  const handleMuteToggle = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      audioRef.current.setMuted(next);
      return next;
    });
  }, []);

  const accent = selectedTrack.accentColor;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0a0a28",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 3D Canvas — always mounted */}
      <div style={{ position: "absolute", inset: 0 }}>
        <ErrorBoundary>
          <RacingGame
            onLap={handleLap}
            onBoostChange={handleBoostChange}
            onSpeedChange={handleSpeedChange}
            racing={gameState === "racing" && !paused}
            trackDef={selectedTrack}
            showTouchControls={isTouchDevice}
          />
        </ErrorBoundary>
      </div>

      {/* HUD */}
      {(gameState === "racing" || gameState === "countdown") && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <HUD
            speed={speed}
            lap={currentLap}
            totalLaps={TOTAL_LAPS}
            lapTime={lapTime}
            bestLapTime={bestLapTime}
            lastLapTime={lastLapTime}
            totalTime={totalTime}
            boosting={boosting}
            countdown={countdown}
            isTouchDevice={isTouchDevice}
          />
        </div>
      )}

      {/* Mute button — visible during racing/countdown */}
      {(gameState === "racing" || gameState === "countdown") && !paused && (
        <button
          onClick={handleMuteToggle}
          title={muted ? "Įjungti garsą" : "Išjungti garsą"}
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${accent}55`,
            borderRadius: 7,
            color: muted ? "#ffffff44" : accent,
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            padding: "8px 12px",
            zIndex: 15,
            transition: "all 0.15s",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `rgba(${hexToRgb(accent)}, 0.15)`;
            e.currentTarget.style.borderColor = accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.55)";
            e.currentTarget.style.borderColor = `${accent}55`;
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {/* Pause button — visible during racing */}
      {gameState === "racing" && !paused && (
        <button
          onClick={handlePause}
          style={{
            position: "absolute",
            bottom: 24,
            left: 70,
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${accent}55`,
            borderRadius: 7,
            color: accent,
            fontSize: 13,
            fontWeight: "bold",
            letterSpacing: 2,
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            padding: "8px 14px",
            zIndex: 15,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `rgba(${hexToRgb(accent)}, 0.15)`;
            e.currentTarget.style.borderColor = accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.55)";
            e.currentTarget.style.borderColor = `${accent}55`;
          }}
        >
          ⏸ PAUZĖ
        </button>
      )}

      {/* Pause overlay */}
      {gameState === "racing" && paused && (
        <PauseMenu
          accentColor={accent}
          onResume={handleResume}
          onRestart={handleRestart}
          onChangeTrack={handleChangeTrack}
          onCancel={handleCancel}
        />
      )}

      {/* Menu / Track Selection */}
      {gameState === "menu" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(8,8,40,0.88)",
            fontFamily: "'Courier New', monospace",
            zIndex: 10,
            overflowY: "auto",
            padding: "24px 16px 32px",
          }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 5, color: accent + "99", marginBottom: 8 }}>
              FUTURISTIC RACING LEAGUE
            </div>
            <h1
              style={{
                fontSize: "clamp(36px, 7vw, 64px)",
                fontWeight: "bold",
                color: accent,
                textShadow: `0 0 30px ${accent}, 0 0 60px ${accent}66`,
                margin: 0,
                letterSpacing: 2,
                lineHeight: 1.1,
              }}
            >
              NEON CIRCUIT
            </h1>
          </div>

          {/* Track selection grid */}
          <div style={{ width: "100%", maxWidth: 740, marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 3,
                color: "#ffffff44",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              SELECT TRACK
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(clamp(90px, 15vw, 140px), 1fr))",
                gap: "clamp(5px, 1vw, 8px)",
              }}
            >
              {TRACKS.map((track) => (
                <TrackCard
                  key={track.id}
                  trackDef={track}
                  selected={selectedTrack.id === track.id}
                  onClick={() => setSelectedTrack(track)}
                />
              ))}
            </div>
          </div>

          {/* Selected track info */}
          <div
            style={{
              width: "100%",
              maxWidth: 740,
              background: `rgba(${hexToRgb(accent)}, 0.06)`,
              border: `1px solid ${accent}33`,
              borderRadius: 10,
              padding: "14px 20px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
                {selectedTrack.name}
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 10,
                    color: DIFFICULTY_COLORS[selectedTrack.difficulty],
                    border: `1px solid ${DIFFICULTY_COLORS[selectedTrack.difficulty]}55`,
                    borderRadius: 3,
                    padding: "2px 6px",
                  }}
                >
                  {selectedTrack.difficulty.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#ffffff66", marginTop: 3 }}>
                {selectedTrack.description}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: "#ffffff44" }}>
              {TOTAL_LAPS} LAPS
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startCountdown}
            style={{
              width: "100%",
              maxWidth: 320,
              padding: "14px",
              background: "transparent",
              border: `2px solid ${accent}`,
              borderRadius: 8,
              color: accent,
              fontSize: 18,
              fontWeight: "bold",
              letterSpacing: 5,
              cursor: "pointer",
              fontFamily: "'Courier New', monospace",
              boxShadow: `0 0 24px ${accent}44`,
              transition: "all 0.2s",
              marginBottom: 20,
            }}
            onMouseEnter={(e) => {
              const btn = e.target as HTMLButtonElement;
              btn.style.background = accent;
              btn.style.color = "#000";
              btn.style.boxShadow = `0 0 40px ${accent}88`;
            }}
            onMouseLeave={(e) => {
              const btn = e.target as HTMLButtonElement;
              btn.style.background = "transparent";
              btn.style.color = accent;
              btn.style.boxShadow = `0 0 24px ${accent}44`;
            }}
          >
            START RACE
          </button>

          <div style={{ fontSize: 11, color: "#ffffff28", letterSpacing: 1, textAlign: "center" }}>
            {isTouchDevice
              ? "Laikykite ▲ — gas · ▼ — stabdžiai · ◀ ▶ — vairavimas · Oranžiniai plotai = greičio impulsas"
              : "W / ↑ \u00a0Accelerate \u00a0·\u00a0 S / ↓ \u00a0Brake \u00a0·\u00a0 A / ← \u00a0D / → \u00a0Steer \u00a0·\u00a0 Orange pads = Speed boost"}
          </div>
        </div>
      )}

      {/* Finished / Leaderboard */}
      {gameState === "finished" && (
        <Leaderboard
          entries={leaderboard}
          latestEntry={latestEntry}
          onPlay={() => setGameState("menu")}
          title="RACE COMPLETE"
        />
      )}
    </div>
  );
}
