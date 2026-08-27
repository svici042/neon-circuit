/** Renders validated, already-persisted race results; Escape returns to menu. */
import { useEffect, useRef } from "react";
import { type LeaderboardEntry } from "./leaderboardStorage";
import { formatTime } from "./time";

export type { LeaderboardEntry } from "./leaderboardStorage";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  latestEntry?: LeaderboardEntry;
  onPlay: () => void;
  title: string;
  storageWarning?: string;
}

export default function Leaderboard({ entries, latestEntry, onPlay, title, storageWarning }: LeaderboardProps) {
  const sorted = [...entries].sort((a, b) => a.totalTime - b.totalTime);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") onPlay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPlay]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,8,0.88)",
        fontFamily: "'Courier New', monospace",
        zIndex: 10,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="leaderboard-panel"
        style={{
          width: 520,
          maxWidth: "92vw",
          background: "rgba(0,0,20,0.95)",
          border: "1px solid #00eeff44",
          borderRadius: 12,
          padding: "36px 40px",
          boxShadow: "0 0 60px #00eeff22, 0 0 120px #4400ff11",
        }}
      >
        <h1
          id="results-title"
          style={{
            textAlign: "center",
            fontSize: 32,
            fontWeight: "bold",
            color: "#00eeff",
            textShadow: "0 0 20px #00eeff",
            letterSpacing: 4,
            marginBottom: 4,
          }}
        >
          {title}
        </h1>
        <p style={{ textAlign: "center", color: "#ffffff44", fontSize: 12, letterSpacing: 2, marginBottom: 28 }}>
          FUTURISTIC RACING LEAGUE
        </p>

        {latestEntry && (
          <div
            style={{
              background: "rgba(0,255,136,0.08)",
              border: "1px solid #00ff8844",
              borderRadius: 8,
              padding: "14px 18px",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 11, color: "#00ff88aa", letterSpacing: 2, marginBottom: 6 }}>YOUR RESULT</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 22, fontWeight: "bold", color: "#00ff88" }}>
                {formatTime(latestEntry.totalTime)}
              </span>
              <span style={{ fontSize: 14, color: "#ffffff66" }}>
                Best lap: {formatTime(latestEntry.bestLap)}
              </span>
            </div>
          </div>
        )}

        {storageWarning && <p role="status" className="storage-warning">{storageWarning}</p>}

        <div style={{ marginBottom: 28 }}>
          <div
            className="leaderboard-header"
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 130px 130px",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid #ffffff11",
              fontSize: 10,
              color: "#ffffff44",
              letterSpacing: 2,
            }}
          >
            <span>#</span>
            <span>DATE</span>
            <span style={{ textAlign: "right" }}>BEST LAP</span>
            <span style={{ textAlign: "right" }}>TOTAL</span>
          </div>
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", color: "#ffffff33", fontSize: 14, padding: "24px 0" }}>
              No records yet
            </div>
          ) : (
            sorted.slice(0, 10).map((entry, i) => (
              <div
                key={entry.id}
                className="leaderboard-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 130px 130px",
                  gap: 8,
                  padding: "10px 0",
                  borderBottom: "1px solid #ffffff08",
                  alignItems: "center",
                  background:
                    latestEntry && entry.totalTime === latestEntry.totalTime && entry.date === latestEntry.date
                      ? "rgba(0,255,136,0.04)"
                      : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#ffffff55",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 13, color: "#ffffff88" }}>{new Date(entry.date).toLocaleDateString()}</span>
                <span style={{ fontSize: 14, color: "#00eeff", textAlign: "right" }}>
                  {formatTime(entry.bestLap)}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    color: i === 0 ? "#ffd700" : "#ffffff",
                    textAlign: "right",
                  }}
                >
                  {formatTime(entry.totalTime)}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={onPlay}
          className="leaderboard-action-button"
        >
          RACE AGAIN
        </button>
      </div>
    </div>
  );
}
