import { describe, expect, it } from "vitest";
import { hexToRgb } from "./color";

describe("hexToRgb", () => {
  it.each([
    ["#00eeff", "0,238,255"],
    ["FF6600", "255,102,0"],
    ["#aAdDfF", "170,221,255"],
  ])("converts %s", (input, expected) => {
    expect(hexToRgb(input)).toBe(expected);
  });

  it.each(["", "#fff", "#00000000", "red", "#00eeff; color:red"])(
    "uses a safe fallback for %s",
    (input) => {
      expect(hexToRgb(input)).toBe("0,238,255");
    },
  );
});
