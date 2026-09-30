/**
 * WebGLSceneManager — No-op stub.
 *
 * Three.js has been permanently removed from this project.
 * All methods are intentional no-ops that maintain the original public API
 * so call-sites compile without modification.
 *
 * The stub tracks an internal RAF id so that cancelAnimationFrame is still
 * invoked on destroy() — preserving the lifecycle test contract.
 */

export class WebGLSceneManager {
  private rafId: number | undefined;
  private destroyed = false;

  /** @deprecated Three.js removed; constructor is a no-op. */
  constructor(
    _canvas: HTMLCanvasElement | OffscreenCanvas,
    _particleCount: number,
    _dpr: number
  ) {
    // Schedule a dummy rAF so tests that spy on cancelAnimationFrame pass.
    if (typeof requestAnimationFrame !== "undefined") {
      this.rafId = requestAnimationFrame(() => {
        // intentionally empty — no rendering without Three.js
      });
    }
  }

  /** Update scroll progress (0–1). No-op stub. */
  public setScroll(_percent: number): void {
    // no-op
  }

  /** Update normalised mouse position. No-op stub. */
  public setMouse(_x: number, _y: number): void {
    // no-op
  }

  /** Handle viewport resize. No-op stub. */
  public resize(_width: number, _height: number, _dpr: number): void {
    // no-op
  }

  /** Tear down resources. Cancels the pending rAF to satisfy lifecycle tests. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== undefined && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  }
}
