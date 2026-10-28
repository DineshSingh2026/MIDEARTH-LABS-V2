/** Mutable, non-React runtime state shared between the WebGL components. */
export type Layout = { w: number; h: number; aspect: number; wide: boolean; portrait: boolean; visW: number; visH: number };

export const runtime = {
  mouse: { x: 0, y: 0, px: -9999, py: -9999, active: false, moved: false },
  activeCount: 0,
  layout: { w: 1440, h: 900, aspect: 1.6, wide: true, portrait: false, visW: 10.6, visH: 6.63 } as Layout,
  /** Which shape family the main particle system currently shows. */
  shape: "arena" as string,
  /** Boot flash intensity 0..1.5 (drives a bloom surge). */
  flash: 0,
  /** Boot intro progress 0..1 (1 once the explosion has settled). */
  introP: 0,
};
