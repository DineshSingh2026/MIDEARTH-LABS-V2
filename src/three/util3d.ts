import * as THREE from "three";
import type { RootState } from "@react-three/fiber";

/** Pixels-per-world-unit factor at distance 1 (for size-attenuated point sprites). */
export function pointScale(state: RootState) {
  const cam = state.camera as THREE.PerspectiveCamera;
  return (state.size.height * state.gl.getPixelRatio() * 0.5) / Math.tan(THREE.MathUtils.degToRad((cam.fov || 45) / 2));
}

/** Frame-rate independent ease factor for a per-60fps-frame lerp amount. */
export const ease = (x: number, dt: number) => 1 - Math.pow(1 - x, dt * 60);
