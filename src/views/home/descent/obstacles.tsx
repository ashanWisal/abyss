"use client";

/**
 * @fileoverview Near misses at each chapter change: something crosses the
 * probe's route, and the probe swerves out of its way.
 *
 * Each obstacle is set where the probe will be when the camera reaches the
 * obstacle's depth (`baseView` + `probeAnchor`), nudged to one side. Its own
 * motion is keyed to the scroll, not the clock — `along` is how far past
 * the meeting point the dive is, in route units — so the shark sweeps across
 * and the rock tumbles down as you scroll, and run backwards when you scroll
 * back up. `dodgeAt` gives the probe its swerve for the same `along`.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, type Group, Vector3 } from "three";
import {
  baseView,
  probeAnchor,
  sampleFrame,
  travelAt,
  VIEW_PITCH,
} from "@/views/home/descent/descent-state";
import { type ModelName, useModel } from "@/views/home/descent/use-model";

interface Obstacle {
  /** Depth (m) where it crosses the probe — a chapter change. */
  depth: number;
  model: ModelName;
  length: number;
  clip?: string;
  /** Where it passes, camera space, relative to the probe's spot. */
  pass: [number, number, number];
  /** Its own motion per route unit scrolled, camera space. */
  sweep: [number, number, number];
  /**
   * Faint self-light for an obstacle met in black water. A tint on its own
   * material, not a light: every real light costs every lit pixel on screen.
   */
  glow?: string;
  /** Spin per route unit scrolled (the rock tumbles). */
  tumble: number;
  /** Which way the probe swerves, camera space, at the closest pass. */
  swerve: [number, number];
}

const OBSTACLES: Obstacle[] = [
  // 01 → 02, in the trench: a shark charges up the open middle of the
  // canyon, passing left of the probe's spot (the canyon curves left, so
  // further right ahead is inside the rock); the probe throws itself right.
  {
    depth: 200,
    model: "shark",
    length: 6,
    clip: "Armature|Swim",
    pass: [-1.6, 0.8, 0],
    sweep: [0.2, -0.1, 1.3],
    tumble: 0,
    swerve: [4.4, -1.8],
  },
  // 02 → 03: a boulder sinks through the probe's spot, turning over; the
  // probe banks hard right.
  {
    depth: 1000,
    model: "rock",
    length: 3.4,
    pass: [-0.5, 0.3, 0],
    sweep: [0.1, -1.1, 0],
    tumble: 0.5,
    swerve: [4.4, -1.2],
  },
  // 03 → 04: a deep-sea shark comes up out of the dark from below left
  // (clear of the jellyfish at 3 500 m); the probe climbs away right.
  {
    depth: 3650,
    model: "shark",
    length: 7,
    clip: "Armature|Swim",
    glow: "#1f4458",
    pass: [-0.4, -0.6, 0],
    sweep: [2.2, 0.9, 0],
    tumble: 0,
    swerve: [3.6, 2.6],
  },
];

/** Route units either side of the meeting point the obstacle is shown for. */
const SHOWN = 22;
/** Width of the swerve, route units. */
const SWERVE_WIDTH = 3.4;

/** How far past an obstacle's meeting point the dive is, route units. */
const alongAt = (obstacle: Obstacle, depth: number) => travelAt(depth) - travelAt(obstacle.depth);

/**
 * The probe's swerve at `depth`, camera space, written into `out` (x, y,
 * and z = how much it is swerving, 0-1, for banking).
 */
export const dodgeAt = (depth: number, out: Vector3) => {
  out.set(0, 0, 0);
  for (const obstacle of OBSTACLES) {
    // Peaks just before the meeting point, so the probe is already clear.
    const along = alongAt(obstacle, depth) + 0.6;
    const amount = Math.exp(-((along / SWERVE_WIDTH) ** 2));
    out.x += obstacle.swerve[0] * amount;
    out.y += obstacle.swerve[1] * amount;
    out.z += amount * Math.sign(obstacle.swerve[0]);
  }
  return out;
};

const viewPosition = new Vector3();
const offset = new Vector3();
const view = new Euler(0, 0, 0, "YXZ");

const ObstacleBody = ({ obstacle }: { obstacle: Obstacle }) => {
  const groupRef = useRef<Group>(null);
  const model = useModel(obstacle.model, obstacle.length, { clip: obstacle.clip, glow: obstacle.glow });

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { depth, time } = sampleFrame(state.clock.elapsedTime, delta);
    const along = alongAt(obstacle, depth);
    group.visible = Math.abs(along) < SHOWN;
    if (!group.visible) return;

    // The probe's spot at the meeting depth, then the pass and the sweep.
    view.set(VIEW_PITCH, baseView(obstacle.depth, viewPosition), 0);
    const [px, py, pz] = obstacle.pass;
    const [sx, sy, sz] = obstacle.sweep;
    offset
      .set(probeAnchor.x + px + sx * along, probeAnchor.y + py + sy * along, probeAnchor.z + pz + sz * along)
      .applyEuler(view);
    group.position.copy(viewPosition).add(offset);

    if (obstacle.tumble) {
      group.rotation.set(along * obstacle.tumble, view.y, along * obstacle.tumble * 0.6);
    } else {
      // Swim along the sweep: face its direction in camera space, then the view's.
      const heading = Math.atan2(sx, sz);
      group.rotation.set(Math.atan2(-sy, Math.hypot(sx, sz)) * 0.5, view.y + heading, Math.sin(time * 2) * 0.05);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={model} />
    </group>
  );
};

export const Obstacles = () => (
  <>
    {OBSTACLES.map((obstacle) => (
      <ObstacleBody key={obstacle.depth} obstacle={obstacle} />
    ))}
  </>
);
