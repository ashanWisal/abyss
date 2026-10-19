/**
 * Shared state of the WebGL descent: the water palette by depth, and the
 * smoothed depth every object in the scene reads each frame.
 *
 * The scroll writes a *target* depth into the dive store; the scene eases
 * towards it (`sampleFrame`) so a flick of the wheel glides instead of
 * teleporting the camera. Sampling is idempotent per frame — every component
 * calls it from its own `useFrame`, and only the first call in a frame moves
 * the value — so no component has to run before another.
 *
 * World height is *travel*, not metres: each chapter is the same distance of
 * world (`TRAVEL`), because each chapter gets the same scroll. In metres the
 * midnight zone (3000 m) would rush past fifteen times faster than the
 * sunlight zone (200 m), and its creatures would cross the frame in a blink.
 */
import { Color, Vector3 } from "three";
import { MAX_DEPTH, useDive } from "@/views/home/dive-store";

/** [depth in metres, world units travelled] — chapter boundaries. */
const TRAVEL: [number, number][] = [
  [0, 0],
  [200, 100],
  [1000, 200],
  [4000, 300],
  [MAX_DEPTH, 330],
];

/** World y of a depth in metres — the camera's height there. */
export const cameraY = (depth: number) => {
  let i = 0;
  while (i < TRAVEL.length - 2 && depth > TRAVEL[i + 1][0]) i += 1;
  const [fromDepth, fromUnits] = TRAVEL[i];
  const [toDepth, toUnits] = TRAVEL[i + 1];
  const t = Math.min(Math.max((depth - fromDepth) / (toDepth - fromDepth), 0), 1);
  return -(fromUnits + (toUnits - fromUnits) * t);
};
/** World y of the sea floor — a little below the camera's last stop. */
export const FLOOR_Y = cameraY(MAX_DEPTH) - 7;

/*
 * The flight path: a spiral circling the signal, which sits on the floor at
 * the spiral's axis (x = z = 0). The radius tightens a little as the probe
 * sinks, so the dive closes in on the source but ends far enough out to frame
 * all of it; it travels ~2.4 units forward for every
 * unit down, so it reads as flying, not dropping.
 */
const TOTAL_TRAVEL = -cameraY(MAX_DEPTH);
const RADIUS_START = 30;
const RADIUS_END = 26;
/** Radians turned per world unit of descent. */
const TURN_RATE = 0.08;

const radiusAt = (travel: number) =>
  RADIUS_START + (RADIUS_END - RADIUS_START) * (travel / TOTAL_TRAVEL);

/**
 * A point on the path at `depth`, moved `inward` units towards the axis and
 * `up` units up. Creatures are placed this way, so they sit beside the route
 * whatever the spiral does. Writes into and returns `out`.
 */
export const pathPoint = (depth: number, out: Vector3, inward = 0, up = 0) => {
  const travel = -cameraY(depth);
  const angle = travel * TURN_RATE;
  const radius = radiusAt(travel) - inward;
  return out.set(Math.sin(angle) * radius, -travel + up, Math.cos(angle) * radius);
};

/** The path's horizontal heading at `depth` — the way the probe is flying. */
export const pathHeading = (depth: number, out: Vector3) => {
  const angle = -cameraY(depth) * TURN_RATE;
  return out.set(Math.cos(angle), 0, -Math.sin(angle));
};

/** World position of the signal — the source on the floor, at the axis. */
/** World units travelled down the route at `depth` — the scroll-linear measure. */
export const travelAt = (depth: number) => -cameraY(depth);

/** Depth (m) at `travel` route units — the inverse of `travelAt`. */
export const depthAtTravel = (travel: number) => {
  let i = 0;
  while (i < TRAVEL.length - 2 && travel > TRAVEL[i + 1][1]) i += 1;
  const [fromDepth, fromUnits] = TRAVEL[i];
  const [toDepth, toUnits] = TRAVEL[i + 1];
  const t = Math.min(Math.max((travel - fromUnits) / (toUnits - fromUnits), 0), 1);
  return fromDepth + (toDepth - fromDepth) * t;
};

/** The view pitches down along the descent and turns this far towards the axis. */
export const VIEW_PITCH = -0.3;
const TOWARDS_AXIS = 0.3;
const towardsAxis = new Vector3();

/**
 * The camera's resting view at `depth` (no pointer, no final turn): writes
 * its position into `position` and returns its yaw. Anything placed "where
 * the probe will be" is placed through this.
 */
export const baseView = (depth: number, position: Vector3, heading = new Vector3()) => {
  pathPoint(depth, position);
  pathHeading(depth, heading);
  towardsAxis.set(-position.x, 0, -position.z).normalize();
  heading.lerp(towardsAxis, TOWARDS_AXIS).normalize();
  return Math.atan2(-heading.x, -heading.z);
};

/**
 * The probe's resting spot in camera space. The probe writes it each frame
 * (it differs on portrait screens) so obstacles can aim at it.
 */
export const probeAnchor = new Vector3(1.6, -0.3, -9);

export const SIGNAL_POSITION = new Vector3(0, FLOOR_Y + 6, 0);

/**
 * The probe's searchlight, written by <Probe> every frame. Creatures call
 * `litAmount` to react when the beam falls on them.
 */
export const searchlight = {
  origin: new Vector3(),
  direction: new Vector3(0, 0, -1),
  /** Cosine of the beam's half-angle. */
  cone: Math.cos(0.32),
  range: 30,
};

const toTarget = new Vector3();

/** 0-1: how squarely the searchlight beam is on `position`. */
export const litAmount = (position: Vector3) => {
  toTarget.subVectors(position, searchlight.origin);
  const distance = toTarget.length();
  if (distance > searchlight.range || distance === 0) return 0;
  const alignment = toTarget.divideScalar(distance).dot(searchlight.direction);
  const inBeam = Math.min(Math.max((alignment - searchlight.cone) / (1 - searchlight.cone) * 3, 0), 1);
  return inBeam * (1 - distance / searchlight.range);
};

/**
 * The signal's rhythm — three short pulses and one long, every 3.2 s. The
 * source, the anglerfish's mimicry and the beacon all read this, so they
 * flash in step. Returns 0-1 brightness.
 */
export const signalPulse = (time: number) => {
  const t = time % 3.2;
  const blip = (start: number, length: number) =>
    t >= start && t < start + length ? Math.sin(((t - start) / length) * Math.PI) : 0;
  return Math.max(blip(0, 0.22), blip(0.4, 0.22), blip(0.8, 0.22), blip(1.3, 0.9));
};

/** How quickly the scene catches up with the scroll, per second. */
const EASE_PER_SECOND = 3.5;

interface WaterStop {
  depth: number;
  /** Backdrop colour at the top / bottom of the screen. */
  top: string;
  bottom: string;
  fog: string;
  fogDensity: number;
  /** Sun rays and caustics strength, 0-1. */
  sun: number;
  ambient: number;
}

/** Water by depth — sunlit teal to black. Literals live here, not in CSS:
    they are WebGL colours, consumed by shaders and three's fog. */
const WATER: WaterStop[] = [
  { depth: 0, top: "#7fe3f0", bottom: "#0e6b8a", fog: "#1a7d97", fogDensity: 0.016, sun: 1, ambient: 1.4 },
  { depth: 200, top: "#2a86b8", bottom: "#0a3864", fog: "#0e4a74", fogDensity: 0.022, sun: 0.35, ambient: 0.8 },
  { depth: 600, top: "#1b5a96", bottom: "#071f42", fog: "#0b3360", fogDensity: 0.026, sun: 0.08, ambient: 0.5 },
  { depth: 1000, top: "#0b2a52", bottom: "#040d1f", fog: "#071834", fogDensity: 0.03, sun: 0, ambient: 0.3 },
  { depth: 4000, top: "#040a16", bottom: "#010205", fog: "#02050b", fogDensity: 0.038, sun: 0, ambient: 0.1 },
  { depth: MAX_DEPTH, top: "#040a16", bottom: "#010205", fog: "#02050b", fogDensity: 0.03, sun: 0, ambient: 0.1 },
];

export interface Water {
  top: Color;
  bottom: Color;
  fog: Color;
  fogDensity: number;
  sun: number;
  ambient: number;
}

const stopColors = WATER.map((stop) => ({
  top: new Color(stop.top),
  bottom: new Color(stop.bottom),
  fog: new Color(stop.fog),
}));

const water: Water = {
  top: new Color(),
  bottom: new Color(),
  fog: new Color(),
  fogDensity: 0,
  sun: 0,
  ambient: 0,
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The water at a depth, interpolated between the stops. Reuses one object. */
const waterAt = (depth: number): Water => {
  let i = 0;
  while (i < WATER.length - 2 && depth > WATER[i + 1].depth) i += 1;
  const from = WATER[i];
  const to = WATER[i + 1];
  const t = Math.min(Math.max((depth - from.depth) / (to.depth - from.depth), 0), 1);
  water.top.lerpColors(stopColors[i].top, stopColors[i + 1].top, t);
  water.bottom.lerpColors(stopColors[i].bottom, stopColors[i + 1].bottom, t);
  water.fog.lerpColors(stopColors[i].fog, stopColors[i + 1].fog, t);
  water.fogDensity = mix(from.fogDensity, to.fogDensity, t);
  water.sun = mix(from.sun, to.sun, t);
  water.ambient = mix(from.ambient, to.ambient, t);
  return water;
};

/**
 * 0-1 visibility of a depth band: ramps in over `fade` metres before `from`,
 * holds, and ramps out over `fade` metres after `to`.
 */
export const band = (depth: number, from: number, to: number, fade: number) =>
  Math.min(
    Math.min(Math.max((depth - (from - fade)) / fade, 0), 1),
    Math.min(Math.max((to + fade - depth) / fade, 0), 1),
  );

export interface Frame {
  /** Smoothed depth, metres. */
  depth: number;
  /** Smoothed pointer, -1..1 on both axes (0,0 = screen centre). */
  pointer: { x: number; y: number };
  /** Animation clock, seconds — frozen under reduced motion. */
  time: number;
  water: Water;
}

const frame: Frame = { depth: 0, pointer: { x: 0, y: 0 }, time: 0, water: waterAt(0) };
let lastClock = -1;
let motion = true;

/** Freeze ambient animation (drift, pulsing, swimming) — reduced motion. */
export const setAmbientMotion = (enabled: boolean) => {
  motion = enabled;
};

/** How quickly the view follows the pointer, per second. */
const POINTER_EASE_PER_SECOND = 2.5;
const rawPointer = { x: 0, y: 0 };

/** Record the pointer (-1..1); the frame eases towards it. */
export const setPointer = (x: number, y: number) => {
  rawPointer.x = x;
  rawPointer.y = y;
};

/** Advance the shared frame once per rendered frame and return it. */
export const sampleFrame = (clock: number, delta: number): Frame => {
  if (clock !== lastClock) {
    const ease = Math.min(1, delta * POINTER_EASE_PER_SECOND);
    frame.pointer.x += (rawPointer.x - frame.pointer.x) * ease;
    frame.pointer.y += (rawPointer.y - frame.pointer.y) * ease;
    lastClock = clock;
    const target = useDive.getState().depth;
    // A jump of more than a chapter (a reload mid-page, an anchor link)
    // snaps, so the scene never swims all the way down from the surface.
    frame.depth = Math.abs(target - frame.depth) > 1000
      ? target
      : frame.depth + (target - frame.depth) * Math.min(1, delta * EASE_PER_SECOND);
    if (motion) frame.time += delta;
    frame.water = waterAt(frame.depth);
  }
  return frame;
};

/** A small deterministic RNG, so procedural layouts match on every visit. */
export const seededRandom = (start: number) => {
  let seed = start;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
};
