/**
 * The current depth of the dive, in metres — written by whichever chapter is
 * scrubbing (<ChapterScene>), read by the header's <DepthGauge>.
 *
 * A store rather than state lifted into the view: the view is a Server
 * Component, and the value changes on every scroll tick, so the gauge
 * subscribes outside React and writes the DOM directly instead of re-rendering.
 */
import { create } from "zustand";

/** Depth the gauge reads as "full" — the floor of the last chapter. */
export const MAX_DEPTH = 4200;

interface DiveState {
  depth: number;
  setDepth: (depth: number) => void;
}

export const useDive = create<DiveState>((set) => ({
  depth: 0,
  setDepth: (depth) => set({ depth }),
}));
