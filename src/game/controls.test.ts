import { describe, expect, it } from "vitest";
import { controls, mapOrientationToSteering, resetControls } from "./controls";

describe("controls", () => {
  it("resets every shared control", () => {
    Object.assign(controls, { forward: true, backward: true, left: true, right: true });
    resetControls();
    expect(controls).toEqual({ forward: false, backward: false, left: false, right: false });
  });

  it.each([[0, 10], [90, -20], [180, -10], [270, 20]])("maps orientation %s°", (angle, expected) => {
    expect(mapOrientationToSteering(20, 10, angle)).toBe(expected);
  });
});
