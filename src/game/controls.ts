export const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

export function setupKeyboardControls(): () => void {
  const down = (e: KeyboardEvent) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") controls.forward = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") controls.backward = true;
    if (e.code === "ArrowLeft" || e.code === "KeyA") controls.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") controls.right = true;
  };
  const up = (e: KeyboardEvent) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") controls.forward = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") controls.backward = false;
    if (e.code === "ArrowLeft" || e.code === "KeyA") controls.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") controls.right = false;
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
  };
}

const GYRO_DEAD_ZONE = 7;

// Raw steering value for the tilt indicator (positive = right, negative = left)
export let gyroGamma = 0;

export async function requestGyroPermission(): Promise<boolean> {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission === "function"
  ) {
    try {
      const result = await (
        DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
      ).requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Returns the current screen orientation angle in degrees.
 * 0   = portrait upright
 * 90  = landscape, device top points LEFT  (rotated counterclockwise)
 * 270 = landscape, device top points RIGHT (rotated clockwise)
 * 180 = portrait upside-down
 */
function getOrientationAngle(): number {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return screen.orientation.angle;
  }
  // Fallback for older Safari: window.orientation is deprecated but still works
  const wo = (window as unknown as { orientation?: number }).orientation;
  if (typeof wo === "number") {
    // window.orientation: 90 = top points right, -90 = top points left
    // Map to screen.orientation.angle convention
    if (wo === 90) return 270;   // top points right → angle 270
    if (wo === -90) return 90;   // top points left  → angle 90
    return wo;
  }
  return 0;
}

export function setupGyroControls(): () => void {
  const handle = (e: DeviceOrientationEvent) => {
    const angle = getOrientationAngle();
    let steer: number;

    if (angle === 90) {
      // Top of device points LEFT — visual left-right = negative beta
      // Tilting landscape screen left → physical top goes down → beta decreases
      steer = -(e.beta ?? 0);
    } else if (angle === 270) {
      // Top of device points RIGHT — visual left-right = positive beta
      // Tilting landscape screen left → physical bottom goes down → beta increases
      steer = e.beta ?? 0;
    } else {
      // Portrait (0 or 180) — use gamma as normal
      steer = e.gamma ?? 0;
    }

    gyroGamma = steer;
    controls.left = steer < -GYRO_DEAD_ZONE;
    controls.right = steer > GYRO_DEAD_ZONE;
  };

  window.addEventListener("deviceorientation", handle, true);
  return () => {
    window.removeEventListener("deviceorientation", handle, true);
    controls.left = false;
    controls.right = false;
    gyroGamma = 0;
  };
}
