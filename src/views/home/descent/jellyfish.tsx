"use client";

/**
 * @fileoverview Jellyfish drifting beside the flight path through the
 * twilight and midnight zones. Each pulses on its own phase; when the
 * searchlight falls on one it flares up and drifts out of the beam.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group, Vector3 } from "three";
import { litAmount, pathPoint, sampleFrame } from "@/views/home/descent/descent-state";
import { glowMaterials, useModel } from "@/views/home/descent/use-model";

interface JellySpec {
  depth: number;
  /** Offset from the path: towards the axis, and up. */
  inward: number;
  up: number;
  length: number;
  tint: string;
  phase: number;
}

const JELLIES: JellySpec[] = [
  { depth: 280, inward: 4, up: -1, length: 4.3, tint: "#9fd8ff", phase: 0 },
  { depth: 420, inward: -3, up: 1.5, length: 5.8, tint: "#c7a6ff", phase: 1.3 },
  { depth: 560, inward: 5, up: 0.5, length: 3.6, tint: "#9fd8ff", phase: 2.1 },
  { depth: 700, inward: -4, up: -1.5, length: 5.0, tint: "#ff8fd1", phase: 0.9 },
  { depth: 860, inward: 3, up: 2, length: 6.5, tint: "#c7a6ff", phase: 2.6 },
  { depth: 1300, inward: -3, up: 0, length: 4.7, tint: "#5ef2d6", phase: 1.7 },
  { depth: 1900, inward: 4, up: -1, length: 5.4, tint: "#ff8fd1", phase: 0.3 },
  { depth: 2700, inward: -4, up: 1, length: 4.3, tint: "#5ef2d6", phase: 2.2 },
  { depth: 3500, inward: 3, up: 0, length: 5.8, tint: "#7fb2ff", phase: 1.1 },
];

const worldPosition = new Vector3();

const Jelly = ({ spec }: { spec: JellySpec }) => {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  /** Smoothed reaction to the beam, so the flare eases in and out. */
  const flareRef = useRef(0);
  const model = useModel("jelly", spec.length, { glow: spec.tint, glowOpacity: 0.75 });
  const home = useMemo(
    () => pathPoint(spec.depth, new Vector3(), spec.inward, spec.up).toArray(),
    [spec.depth, spec.inward, spec.up],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;
    const { time } = sampleFrame(state.clock.elapsedTime, delta);
    group.getWorldPosition(worldPosition);
    flareRef.current += (litAmount(worldPosition) - flareRef.current) * Math.min(1, delta * 4);
    const flare = flareRef.current;

    const pulse = Math.sin(time * 1.4 + spec.phase);
    body.scale.set(1 - pulse * 0.06, 1 + pulse * 0.1, 1 - pulse * 0.06);
    // Bob in place, and shy away (up) from the beam.
    group.position.set(home[0], home[1] + Math.sin(time * 0.35 + spec.phase) * 0.5 + flare * 1.5, home[2]);
    group.rotation.z = Math.sin(time * 0.25 + spec.phase) * 0.12;
    for (const material of glowMaterials(body)) {
      material.emissiveIntensity = 0.5 + (pulse + 1) * 0.25 + flare * 3;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive ref={bodyRef} object={model} />
    </group>
  );
};

export const Jellyfish = () => (
  <>
    {JELLIES.map((spec) => (
      <Jelly key={spec.depth} spec={spec} />
    ))}
  </>
);
