import { useEffect, useRef, useState, useCallback } from "react";
import { controls, gyroGamma, requestGyroPermission, setupGyroControls } from "./controls";

interface TouchControlsProps {
  accentColor: string;
  visible: boolean;
}

type ControlKey = keyof typeof controls;

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0,238,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

function TouchButton({
  label,
  controlKey,
  style,
  accentColor,
  fontSize = 22,
}: {
  label: string;
  controlKey: ControlKey;
  style: React.CSSProperties;
  accentColor: string;
  fontSize?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const activate = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      controls[controlKey] = true;
      el.style.background = `rgba(${hexToRgb(accentColor)}, 0.55)`;
      el.style.transform = "scale(0.93)";
    };
    const deactivate = () => {
      controls[controlKey] = false;
      el.style.background = "rgba(0,0,0,0.45)";
      el.style.transform = "scale(1)";
    };

    el.addEventListener("touchstart", activate, { passive: false });
    el.addEventListener("touchend", deactivate);
    el.addEventListener("touchcancel", deactivate);
    el.addEventListener("mousedown", activate);
    el.addEventListener("mouseup", deactivate);
    el.addEventListener("mouseleave", deactivate);

    return () => {
      el.removeEventListener("touchstart", activate);
      el.removeEventListener("touchend", deactivate);
      el.removeEventListener("touchcancel", deactivate);
      el.removeEventListener("mousedown", activate);
      el.removeEventListener("mouseup", deactivate);
      el.removeEventListener("mouseleave", deactivate);
    };
  }, [controlKey, accentColor]);

  return (
    <button
      ref={ref}
      style={{
        position: "absolute",
        width: 70,
        height: 70,
        borderRadius: 14,
        background: "rgba(0,0,0,0.45)",
        border: `2px solid ${accentColor}66`,
        color: accentColor,
        fontSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        transition: "transform 0.07s, background 0.07s",
        fontFamily: "'Courier New', monospace",
        boxShadow: `0 0 16px rgba(0,0,0,0.6), inset 0 0 8px rgba(0,0,0,0.3)`,
        backdropFilter: "blur(4px)",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

function TiltIndicator({ accentColor }: { accentColor: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const gamma = Math.max(-45, Math.min(45, gyroGamma));
      const pct = (gamma + 45) / 90;

      if (dotRef.current) {
        dotRef.current.style.left = `calc(${pct * 100}% - 10px)`;
        dotRef.current.style.background =
          Math.abs(gamma) < 7 ? "#ffffff66" : accentColor;
        dotRef.current.style.boxShadow =
          Math.abs(gamma) >= 7 ? `0 0 8px ${accentColor}` : "none";
      }
      if (leftRef.current) {
        leftRef.current.style.opacity = gamma < -7 ? "1" : "0.25";
      }
      if (rightRef.current) {
        rightRef.current.style.opacity = gamma > 7 ? "1" : "0.25";
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [accentColor]);

  return (
    <div
      style={{
        position: "relative",
        width: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 3,
          color: accentColor,
          textShadow: `0 0 8px ${accentColor}`,
        }}
      >
        PASVIRTI VAIRUOTI
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        <span ref={leftRef} style={{ color: accentColor, fontSize: 14, transition: "opacity 0.1s" }}>
          ◀
        </span>
        <div
          ref={barRef}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: "#ffffff18",
            position: "relative",
            border: `1px solid ${accentColor}33`,
          }}
        >
          <div
            ref={dotRef}
            style={{
              position: "absolute",
              top: -7,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#ffffff66",
              transition: "background 0.1s, box-shadow 0.1s",
            }}
          />
        </div>
        <span ref={rightRef} style={{ color: accentColor, fontSize: 14, transition: "opacity 0.1s" }}>
          ▶
        </span>
      </div>
      <div style={{ fontSize: 10, color: "#ffffff33", letterSpacing: 1 }}>
        Dead zone ±7°
      </div>
    </div>
  );
}

export default function TouchControls({ accentColor, visible }: TouchControlsProps) {
  const [gyroMode, setGyroMode] = useState(false);
  const [gyroStatus, setGyroStatus] = useState<"idle" | "denied" | "active">("idle");
  const cleanupGyroRef = useRef<(() => void) | null>(null);

  const toggleGyro = useCallback(async () => {
    if (gyroMode) {
      cleanupGyroRef.current?.();
      cleanupGyroRef.current = null;
      setGyroMode(false);
      setGyroStatus("idle");
    } else {
      const granted = await requestGyroPermission();
      if (!granted) {
        setGyroStatus("denied");
        setTimeout(() => setGyroStatus("idle"), 3000);
        return;
      }
      cleanupGyroRef.current = setupGyroControls();
      setGyroMode(true);
      setGyroStatus("active");
    }
  }, [gyroMode]);

  useEffect(() => {
    return () => {
      cleanupGyroRef.current?.();
    };
  }, []);

  if (!visible) return null;

  // Responsive sizing: smaller on small landscape screens
  const BTN = Math.min(70, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.14));
  const PAD = Math.max(12, Math.round(BTN * 0.22));
  const GAP = Math.max(6, Math.round(BTN * 0.1));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 16,
      }}
    >
      {/* Gyro toggle button — top centre */}
      <div
        style={{
          position: "absolute",
          top: PAD,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={toggleGyro}
          style={{
            padding: "7px 16px",
            background: gyroMode ? `rgba(${hexToRgb(accentColor)}, 0.3)` : "rgba(0,0,0,0.45)",
            border: `2px solid ${gyroMode ? accentColor : accentColor + "55"}`,
            borderRadius: 20,
            color: gyroMode ? accentColor : accentColor + "99",
            fontSize: 12,
            letterSpacing: 2,
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            userSelect: "none",
            WebkitUserSelect: "none",
            backdropFilter: "blur(4px)",
            boxShadow: gyroMode ? `0 0 16px ${accentColor}44` : "none",
            transition: "all 0.2s",
          }}
        >
          {gyroMode ? "📱 GIROSKOPAS" : "📱 GIROSKOPAS"}
        </button>
        {gyroStatus === "denied" && (
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              color: "#ff4444",
              textAlign: "center",
              fontFamily: "'Courier New', monospace",
            }}
          >
            Prieiga atsisakyta
          </div>
        )}
      </div>

      {/* Tilt indicator — bottom centre, only in gyro mode */}
      {gyroMode && (
        <div
          style={{
            position: "absolute",
            bottom: PAD + BTN + GAP + 16,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        >
          <TiltIndicator accentColor={accentColor} />
        </div>
      )}

      {/* Left side: steering buttons — hidden in gyro mode */}
      {!gyroMode && (
        <div
          style={{
            position: "absolute",
            bottom: PAD,
            left: PAD,
            width: BTN * 2 + GAP,
            height: BTN,
            pointerEvents: "auto",
          }}
        >
          <TouchButton
            label="◀"
            controlKey="left"
            accentColor={accentColor}
            style={{ bottom: 0, left: 0 }}
          />
          <TouchButton
            label="▶"
            controlKey="right"
            accentColor={accentColor}
            style={{ bottom: 0, left: BTN + GAP }}
          />
        </div>
      )}

      {/* Right side: gas + brake — always visible */}
      <div
        style={{
          position: "absolute",
          bottom: PAD,
          right: PAD,
          width: BTN,
          height: BTN * 2 + GAP,
          pointerEvents: "auto",
        }}
      >
        <TouchButton
          label="▲"
          controlKey="forward"
          accentColor={accentColor}
          style={{ bottom: BTN + GAP, right: 0 }}
        />
        <TouchButton
          label="▼"
          controlKey="backward"
          accentColor={accentColor}
          style={{ bottom: 0, right: 0 }}
        />
      </div>
    </div>
  );
}
