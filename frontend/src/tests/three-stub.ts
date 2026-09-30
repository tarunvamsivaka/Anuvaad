/**
 * Minimal Three.js API stub for test files.
 *
 * Only replicates the subset of THREE used by our empirical test suites:
 *   - THREE.Color (hex constructor, r/g/b, getHexString, lerp)
 *   - THREE.MathUtils.lerp
 *
 * Three.js has been removed from the project. Tests that previously tested
 * WebGL math now use this self-contained stub.
 */

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
export class Color {
  r: number;
  g: number;
  b: number;

  constructor(hex: number) {
    this.r = ((hex >> 16) & 0xff) / 255;
    this.g = ((hex >> 8) & 0xff) / 255;
    this.b = (hex & 0xff) / 255;
  }

  /** Linearly interpolate toward `color` by `alpha` (mutates this). */
  lerp(color: Color, alpha: number): this {
    this.r += (color.r - this.r) * alpha;
    this.g += (color.g - this.g) * alpha;
    this.b += (color.b - this.b) * alpha;
    return this;
  }

  /** Return 6-char lowercase hex string, e.g. "f5f3ee". */
  getHexString(): string {
    const toHex = (v: number) =>
      Math.round(Math.min(Math.max(v, 0), 1) * 255)
        .toString(16)
        .padStart(2, "0");
    return `${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  copy(color: Color): this {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    return this;
  }
}

// ---------------------------------------------------------------------------
// MathUtils
// ---------------------------------------------------------------------------
export const MathUtils = {
  lerp(x: number, y: number, t: number): number {
    return x + (y - x) * t;
  },
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },
};

// ---------------------------------------------------------------------------
// Re-export as namespace-style default for `import * as THREE` patterns
// ---------------------------------------------------------------------------
const THREE = { Color, MathUtils };
export default THREE;
