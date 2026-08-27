/**
 * Touch and orientation adapters write to the shared controls object consumed
 * by RacingGame. Pointer capture handles releases outside a button, while the
 * request generation below prevents a late sensor-permission result from
 * reinstalling listeners after the controls have been hidden or unmounted.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { controls, deviceOrientationSupported, gyroGamma, requestGyroPermission, resetControls, setupGyroControls } from "./controls";
import { hexToRgb } from "./color";

interface TouchControlsProps { accentColor: string; visible: boolean; }
type ControlKey = keyof typeof controls;
type GyroStatus = "idle" | "checking" | "denied" | "unavailable" | "active";

function TouchButton({ label, accessibleName, controlKey, style, accentColor }: {
  label: string; accessibleName: string; controlKey: ControlKey; style: CSSProperties; accentColor: string;
}) {
  const [active, setActive] = useState(false);
  const deactivate = useCallback(() => { controls[controlKey] = false; setActive(false); }, [controlKey]);
  useEffect(() => deactivate, [deactivate]);
  const activate = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    controls[controlKey] = true;
    setActive(true);
  };
  return (
    <button type="button" aria-label={accessibleName} aria-pressed={active} onPointerDown={activate}
      onPointerUp={deactivate} onPointerCancel={deactivate} onLostPointerCapture={deactivate}
      style={{ position: "absolute", width: "var(--touch-button)", height: "var(--touch-button)", borderRadius: 14,
        background: active ? `rgba(${hexToRgb(accentColor)}, 0.55)` : "rgba(0,0,0,0.45)",
        border: `2px solid ${accentColor}66`, color: accentColor, fontSize: 22, display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", touchAction: "none",
        transform: active ? "scale(0.93)" : "scale(1)", transition: "transform 0.07s, background 0.07s",
        fontFamily: "'Courier New', monospace", boxShadow: "0 0 16px rgba(0,0,0,0.6), inset 0 0 8px rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)", ...style }}>
      {label}
    </button>
  );
}

function TiltIndicator({ accentColor }: { accentColor: string }) {
  const [steer, setSteer] = useState(0);
  useEffect(() => {
    let animationFrame = 0;
    const tick = () => { setSteer(Math.max(-45, Math.min(45, gyroGamma))); animationFrame = requestAnimationFrame(tick); };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, []);
  const percentage = ((steer + 45) / 90) * 100;
  return (
    <div className="tilt-indicator" aria-hidden="true">
      <div style={{ fontSize: 10, letterSpacing: 3, color: accentColor }}>PASVIRTI VAIRUOTI</div>
      <div className="tilt-track"><span style={{ opacity: steer < -7 ? 1 : 0.25 }}>◀</span>
        <div className="tilt-bar" style={{ borderColor: `${accentColor}55` }}>
          <div className="tilt-dot" style={{ left: `calc(${percentage}% - 10px)`, background: Math.abs(steer) < 7 ? "#ffffff66" : accentColor }} />
        </div><span style={{ opacity: steer > 7 ? 1 : 0.25 }}>▶</span></div>
    </div>
  );
}

export default function TouchControls({ accentColor, visible }: TouchControlsProps) {
  const [gyroStatus, setGyroStatus] = useState<GyroStatus>(() => deviceOrientationSupported() ? "idle" : "unavailable");
  const cleanupGyroRef = useRef<(() => void) | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const gyroRequestRef = useRef(0);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const stopGyro = useCallback(() => {
    gyroRequestRef.current += 1;
    cleanupGyroRef.current?.(); cleanupGyroRef.current = null;
    if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = null;
    setGyroStatus(deviceOrientationSupported() ? "idle" : "unavailable");
  }, []);
  const toggleGyro = useCallback(async () => {
    if (gyroStatus === "active" || gyroStatus === "checking") { stopGyro(); return; }
    if (!deviceOrientationSupported()) { setGyroStatus("unavailable"); return; }
    const request = ++gyroRequestRef.current;
    setGyroStatus("checking");
    if (!(await requestGyroPermission())) {
      if (request === gyroRequestRef.current && visibleRef.current) setGyroStatus("denied");
      return;
    }
    if (request !== gyroRequestRef.current || !visibleRef.current) return;
    let verified = false;
    cleanupGyroRef.current = setupGyroControls(() => {
      if (request !== gyroRequestRef.current || !visibleRef.current) return;
      verified = true; setGyroStatus("active");
      if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    });
    statusTimerRef.current = window.setTimeout(() => {
      statusTimerRef.current = null;
      if (!verified && request === gyroRequestRef.current) {
        cleanupGyroRef.current?.(); cleanupGyroRef.current = null;
        setGyroStatus("unavailable");
      }
    }, 1500);
  }, [gyroStatus, stopGyro]);
  useEffect(() => { if (!visible) { stopGyro(); resetControls(); } }, [visible, stopGyro]);
  useEffect(() => () => {
    gyroRequestRef.current += 1;
    cleanupGyroRef.current?.();
    if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
    resetControls();
  }, []);
  if (!visible) return null;
  const gyroMode = gyroStatus === "active" || gyroStatus === "checking";
  return (
    <div className="touch-controls" style={{ "--touch-accent": accentColor } as CSSProperties}>
      <div className="gyro-control">
        <button type="button" aria-label="Toggle gyroscope steering" aria-pressed={gyroStatus === "active"}
          onClick={toggleGyro} disabled={gyroStatus === "unavailable"}
          style={{ background: gyroMode ? `rgba(${hexToRgb(accentColor)}, 0.3)` : "rgba(0,0,0,0.45)",
            borderColor: gyroMode ? accentColor : `${accentColor}55`, color: accentColor }}>📱 GIROSKOPAS</button>
        {gyroStatus === "checking" && <span role="status">Tikrinamas jutiklis…</span>}
        {gyroStatus === "denied" && <span role="status">Prieiga atsisakyta</span>}
        {gyroStatus === "unavailable" && <span role="status">Giroskopas nepasiekiamas</span>}
      </div>
      {gyroStatus === "active" && <TiltIndicator accentColor={accentColor} />}
      {!gyroMode && <div className="steering-controls">
        <TouchButton label="◀" accessibleName="Steer left" controlKey="left" accentColor={accentColor} style={{ left: 0 }} />
        <TouchButton label="▶" accessibleName="Steer right" controlKey="right" accentColor={accentColor} style={{ right: 0 }} />
      </div>}
      <div className="pedal-controls">
        <TouchButton label="▲" accessibleName="Accelerate" controlKey="forward" accentColor={accentColor} style={{ top: 0 }} />
        <TouchButton label="▼" accessibleName="Brake and reverse" controlKey="backward" accentColor={accentColor} style={{ bottom: 0 }} />
      </div>
    </div>
  );
}
