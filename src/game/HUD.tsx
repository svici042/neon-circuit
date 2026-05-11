interface HUDProps {
  speed: number;
  lap: number;
  totalLaps: number;
  lapTime: number;
  bestLapTime: number | null;
  lastLapTime: number | null;
  totalTime: number;
  boosting: boolean;
  countdown: number;
  isTouchDevice?: boolean;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00.000";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

export default function HUD({
  speed,
  lap,
  totalLaps,
  lapTime,
  bestLapTime,
  lastLapTime,
  totalTime,
  boosting,
  countdown,
  isTouchDevice = false,
}: HUDProps) {
  const speedKmh = Math.round(Math.abs(speed) * 120);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "'Courier New', monospace",
        userSelect: "none",
      }}
    >
      {/* Countdown overlay */}
      {countdown > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "clamp(60px, 15vmin, 120px)",
              fontWeight: "bold",
              color: countdown === 1 ? "#00ff88" : "#00eeff",
              textShadow: `0 0 40px ${countdown === 1 ? "#00ff88" : "#00eeff"}`,
              letterSpacing: -4,
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Speedometer — bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(16px, 3vmin, 32px)",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          background: "rgba(0,0,0,0.6)",
          border: `1px solid ${boosting ? "#ff6600" : "#00eeff"}`,
          borderRadius: 8,
          padding: "clamp(6px,1.5vmin,10px) clamp(14px,3vw,28px)",
          boxShadow: `0 0 18px ${boosting ? "#ff6600" : "#00eeff"}55`,
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <div
          style={{
            fontSize: "clamp(28px, 6vmin, 48px)",
            fontWeight: "bold",
            color: boosting ? "#ff6600" : "#00eeff",
            textShadow: `0 0 16px ${boosting ? "#ff6600" : "#00eeff"}`,
            lineHeight: 1,
          }}
        >
          {speedKmh}
        </div>
        <div style={{ fontSize: "clamp(9px, 1.5vmin, 12px)", color: "#ffffff88", letterSpacing: 3, marginTop: 2 }}>
          {boosting ? "BOOST!" : "KM/H"}
        </div>
      </div>

      {/* Lap counter — top center */}
      <div
        style={{
          position: "absolute",
          top: "clamp(12px, 2vmin, 24px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.6)",
          border: "1px solid #00eeff",
          borderRadius: 8,
          padding: "clamp(4px,1vmin,8px) clamp(12px,2.5vw,24px)",
          textAlign: "center",
          boxShadow: "0 0 16px #00eeff33",
        }}
      >
        <div style={{ fontSize: "clamp(9px,1.4vmin,14px)", color: "#ffffff66", letterSpacing: 2 }}>LAP</div>
        <div style={{ fontSize: "clamp(20px,4vmin,32px)", fontWeight: "bold", color: "#ffffff", lineHeight: 1 }}>
          {Math.min(lap, totalLaps)} / {totalLaps}
        </div>
      </div>

      {/* Times — top left */}
      <div
        style={{
          position: "absolute",
          top: "clamp(12px, 2vmin, 24px)",
          left: "clamp(12px, 2vw, 24px)",
          background: "rgba(0,0,0,0.6)",
          border: "1px solid #ffffff22",
          borderRadius: 8,
          padding: "clamp(6px,1.2vmin,12px) clamp(10px,2vw,18px)",
          minWidth: "clamp(120px, 20vw, 190px)",
          boxShadow: "0 0 10px #00000088",
        }}
      >
        <div style={{ marginBottom: "clamp(4px,0.8vmin,8px)" }}>
          <div style={{ fontSize: "clamp(8px,1.2vmin,10px)", color: "#ffffff55", letterSpacing: 2, marginBottom: 2 }}>LAP TIME</div>
          <div style={{ fontSize: "clamp(14px,2.5vmin,22px)", color: "#00eeff", fontWeight: "bold" }}>{formatTime(lapTime)}</div>
        </div>
        {lastLapTime !== null && (
          <div style={{ marginBottom: "clamp(4px,0.8vmin,8px)" }}>
            <div style={{ fontSize: "clamp(8px,1.2vmin,10px)", color: "#ffffff55", letterSpacing: 2, marginBottom: 2 }}>LAST LAP</div>
            <div style={{ fontSize: "clamp(11px,2vmin,16px)", color: "#ffffff99" }}>{formatTime(lastLapTime)}</div>
          </div>
        )}
        {bestLapTime !== null && (
          <div>
            <div style={{ fontSize: "clamp(8px,1.2vmin,10px)", color: "#ffffff55", letterSpacing: 2, marginBottom: 2 }}>BEST LAP</div>
            <div style={{ fontSize: "clamp(11px,2vmin,16px)", color: "#00ff88", fontWeight: "bold" }}>{formatTime(bestLapTime)}</div>
          </div>
        )}
      </div>

      {/* Total time — top right */}
      <div
        style={{
          position: "absolute",
          top: "clamp(12px, 2vmin, 24px)",
          right: "clamp(12px, 2vw, 24px)",
          background: "rgba(0,0,0,0.6)",
          border: "1px solid #ffffff22",
          borderRadius: 8,
          padding: "clamp(6px,1.2vmin,12px) clamp(10px,2vw,18px)",
          textAlign: "right",
          boxShadow: "0 0 10px #00000088",
        }}
      >
        <div style={{ fontSize: "clamp(8px,1.2vmin,10px)", color: "#ffffff55", letterSpacing: 2, marginBottom: 2 }}>TOTAL TIME</div>
        <div style={{ fontSize: "clamp(14px,2.5vmin,22px)", color: "#ffffff", fontWeight: "bold" }}>{formatTime(totalTime)}</div>
      </div>

      {/* Controls hint — hidden on touch devices */}
      {!isTouchDevice && (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(12px,2vmin,24px)",
            right: "clamp(12px,2vw,24px)",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid #ffffff11",
            borderRadius: 6,
            padding: "clamp(5px,1vmin,8px) clamp(8px,1.5vw,14px)",
            fontSize: "clamp(9px,1.3vmin,11px)",
            color: "#ffffff44",
            letterSpacing: 1,
            lineHeight: 1.7,
          }}
        >
          W / ↑ — Accelerate<br />
          S / ↓ — Brake<br />
          A / ← D / → — Steer
        </div>
      )}
    </div>
  );
}
