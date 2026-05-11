export interface LeaderboardEntry {
  name: string;
  totalTime: number;
  bestLap: number;
  date: string;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00.000";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  latestEntry?: LeaderboardEntry;
  onPlay: () => void;
  title: string;
}

export default function Leaderboard({ entries, latestEntry, onPlay, title }: LeaderboardProps) {
  const sorted = [...entries].sort((a, b) => a.totalTime - b.totalTime);

  return (
    <div
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

        <div style={{ marginBottom: 28 }}>
          <div
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
                key={i}
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
                <span style={{ fontSize: 13, color: "#ffffff88" }}>{entry.date}</span>
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
          onClick={onPlay}
          style={{
            width: "100%",
            padding: "14px",
            background: "transparent",
            border: "2px solid #00eeff",
            borderRadius: 8,
            color: "#00eeff",
            fontSize: 16,
            fontWeight: "bold",
            letterSpacing: 4,
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            boxShadow: "0 0 20px #00eeff33",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "#00eeff";
            (e.target as HTMLButtonElement).style.color = "#000";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "transparent";
            (e.target as HTMLButtonElement).style.color = "#00eeff";
          }}
        >
          RACE AGAIN
        </button>
      </div>
    </div>
  );
}
