import * as THREE from "three";

export const N_RIP = 6;
export const N_ORB = 3;

/** Shared, mutable arena state (no React re-renders). Used by the dark arena and the light "porcelain" arena. */
export const arena = {
  vis: 0,
  bootT: 1e6,
  flash: 0,
  flashCol: new THREE.Color("#ffffff"),
  rip: Array.from({ length: N_RIP }, () => new THREE.Vector4(0, 0, -100, 0)),
  ripNext: 0,
  orbs: Array.from({ length: N_ORB }, () => new THREE.Vector4(0, 0, 0, 0)), // x, z, glow, _
  sector: 0,
  sectorAmt: 0,
  /** 0..1: dims the arena on the left of the screen so the hero copy stays readable. */
  leftDim: 0,
  /** 0..1: pushes the near-camera fade further out (engines -> platform hand-off keeps the lower half clean). */
  nearK: 0,
  /** framebuffer width in px (for the screen-space left dim). */
  resX: 1,
};

export function addRipple(x: number, z: number, t: number, strength = 1) {
  arena.rip[arena.ripNext].set(x, z, t, strength);
  arena.ripNext = (arena.ripNext + 1) % N_RIP;
}
