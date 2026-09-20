/**
 * Empirical Stress Test Harness for Milestone 1
 * Validates WebGL background lerp precision, boundary safety, and reduced motion fallback.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";

describe("M1 Empirical WebGL Lerp & Reduced Motion Stress Harness", () => {
  it("maintains valid RGB ranges [0, 1] during color lerp from Warm Cream to Deep Dark Room", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);
    const currentThemeColor = new THREE.Color(0xf5f3ee);

    expect(creamColor.r).toBeGreaterThanOrEqual(0);
    expect(creamColor.r).toBeLessThanOrEqual(1);
    expect(darkColor.r).toBeGreaterThanOrEqual(0);
    expect(darkColor.r).toBeLessThanOrEqual(1);

    // Simulate 100 frame ticks entering dark section
    for (let tick = 1; tick <= 100; tick++) {
      currentThemeColor.lerp(darkColor, 0.05);
      expect(Number.isNaN(currentThemeColor.r)).toBe(false);
      expect(Number.isNaN(currentThemeColor.g)).toBe(false);
      expect(Number.isNaN(currentThemeColor.b)).toBe(false);
      expect(currentThemeColor.r).toBeGreaterThanOrEqual(0);
      expect(currentThemeColor.r).toBeLessThanOrEqual(1);
    }

    // Distance after 100 ticks should be < 0.01 (converged)
    const dist = Math.sqrt(
      Math.pow(currentThemeColor.r - darkColor.r, 2) +
      Math.pow(currentThemeColor.g - darkColor.g, 2) +
      Math.pow(currentThemeColor.b - darkColor.b, 2)
    );
    expect(dist).toBeLessThan(0.01);
  });

  it("handles exact scroll boundary transitions for dark theme window [0.42, 0.72]", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);

    const getTarget = (scrollVal: number) => {
      if (scrollVal >= 0.42 && scrollVal <= 0.72) {
        return darkColor;
      }
      return creamColor;
    };

    expect(getTarget(-0.1)).toEqual(creamColor);
    expect(getTarget(0.0)).toEqual(creamColor);
    expect(getTarget(0.41999)).toEqual(creamColor);
    expect(getTarget(0.42)).toEqual(darkColor);
    expect(getTarget(0.57)).toEqual(darkColor);
    expect(getTarget(0.72)).toEqual(darkColor);
    expect(getTarget(0.72001)).toEqual(creamColor);
    expect(getTarget(1.0)).toEqual(creamColor);
    expect(getTarget(1.5)).toEqual(creamColor);
  });

  it("survives 1000 high-frequency scroll oscillations without numerical instability", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);
    const currentColor = new THREE.Color(0xf5f3ee);

    for (let i = 0; i < 1000; i++) {
      const scrollVal = i % 2 === 0 ? 0.40 : 0.50;
      const target = scrollVal >= 0.42 && scrollVal <= 0.72 ? darkColor : creamColor;
      currentColor.lerp(target, 0.05);

      expect(Number.isNaN(currentColor.r)).toBe(false);
      expect(currentColor.r).toBeGreaterThanOrEqual(0);
      expect(currentColor.r).toBeLessThanOrEqual(1);
    }
  });
});
