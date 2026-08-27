export const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

type ControlKey = keyof typeof controls;
const keyboardCodes: Record<string, ControlKey> = {
  ArrowUp: "forward", KeyW: "forward", ArrowDown: "backward", KeyS: "backward",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};
let keyboardEnabled = false;

export function resetControls(): void {
  controls.forward = false;
  controls.backward = false;
  controls.left = false;
  controls.right = false;
  gyroGamma = 0;
}

export function setKeyboardControlsEnabled(enabled: boolean): void {
  keyboardEnabled = enabled;
  if (!enabled) resetControls();
}

export function setupKeyboardControls(): () => void {
  const down = (event: KeyboardEvent) => {
    const control = keyboardCodes[event.code];
    if (!keyboardEnabled || !control) return;
    if (event.code.startsWith("Arrow")) event.preventDefault();
    controls[control] = true;
  };
  const up = (event: KeyboardEvent) => {
    const control = keyboardCodes[event.code];
    if (!control) return;
    if (keyboardEnabled && event.code.startsWith("Arrow")) event.preventDefault();
    controls[control] = false;
  };
  const reset = () => resetControls();
  const visibility = () => { if (document.hidden) resetControls(); };
  window.addEventListener("keydown", down, { passive: false });
  window.addEventListener("keyup", up, { passive: false });
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", reset);
    document.removeEventListener("visibilitychange", visibility);
    resetControls();
  };
}

const GYRO_DEAD_ZONE = 7;
export let gyroGamma = 0;

export function deviceOrientationSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

export async function requestGyroPermission(): Promise<boolean> {
  if (!deviceOrientationSupported()) return false;
  const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof orientationEvent.requestPermission !== "function") return true;
  try {
    return (await orientationEvent.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function getOrientationAngle(): number {
  const screenAngle = globalThis.screen?.orientation?.angle;
  if (typeof screenAngle === "number") return ((screenAngle % 360) + 360) % 360;
  const legacy = (window as typeof window & { orientation?: number }).orientation;
  return typeof legacy === "number" ? ((legacy % 360) + 360) % 360 : 0;
}

export function mapOrientationToSteering(beta: number | null, gamma: number | null, angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 90) return -(beta ?? 0);
  if (normalized === 180) return -(gamma ?? 0);
  if (normalized === 270) return beta ?? 0;
  return gamma ?? 0;
}

export function setupGyroControls(onReading?: () => void): () => void {
  let receivedReading = false;
  const handle = (event: DeviceOrientationEvent) => {
    if (event.beta === null && event.gamma === null) return;
    const steer = mapOrientationToSteering(event.beta, event.gamma, getOrientationAngle());
    gyroGamma = steer;
    controls.left = steer < -GYRO_DEAD_ZONE;
    controls.right = steer > GYRO_DEAD_ZONE;
    if (!receivedReading) {
      receivedReading = true;
      onReading?.();
    }
  };
  window.addEventListener("deviceorientation", handle, true);
  return () => {
    window.removeEventListener("deviceorientation", handle, true);
    controls.left = false;
    controls.right = false;
    gyroGamma = 0;
  };
}
