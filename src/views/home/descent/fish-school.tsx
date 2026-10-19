"use client";

/**
 * @fileoverview A school of animated fish circling just off the flight path
 * in the sunlit zone. Each fish is its own clone of the rigged model, playing
 * its swim cycle. Point the searchlight at the school and it scatters away
 * from the beam, then regroups.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group, Vector3 } from "three";
import {
  litAmount,
  pathPoint,
  sampleFrame,
  searchlight,
  seededRandom,
} from "@/views/home/descent/descent-state";
import { useModel } from "@/views/home/descent/use-model";

const COUNT = 26;
const RADIUS = 4.5;

const center = new Vector3();
const away = new Vector3();

interface Lane {
  angle: number;
  radius: number;
  height: number;
  speed: number;
}

interface FishProps {
  lane: Lane;
  /** The school's current scatter offset, shared by every fish. */
  scatter: Vector3;
}

const Fish = ({ lane, scatter }: FishProps) => {
  const fishRef = useRef<Group>(null);
  const model = useModel("fish", 1.5, { clip: "Armature|Swim" });

  useFrame((state, delta) => {
    const fish = fishRef.current;
    if (!fish) return;
    const { time } = sampleFrame(state.clock.elapsedTime, delta);
    const angle = lane.angle + time * lane.speed;
    fish.position.set(
      Math.cos(angle) * lane.radius + scatter.x,
      lane.height + Math.sin(angle * 2) * 0.3 + scatter.y,
      Math.sin(angle) * lane.radius + scatter.z,
    );
    // Face along the circle's tangent.
    fish.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle));
  });

  return (
    <group ref={fishRef}>
      <primitive object={model} />
    </group>
  );
};

/** Shared, mutable scatter offset — one school, so module-level. */
const scatter = new Vector3();

export const FishSchool = () => {
  const schoolRef = useRef<Group>(null);
  const home = useMemo(() => pathPoint(28, new Vector3(), 2, -2).toArray(), []);
  const lanes = useMemo<Lane[]>(() => {
    const random = seededRandom(11);
    return Array.from({ length: COUNT }, () => ({
      angle: random() * Math.PI * 2,
      radius: RADIUS + (random() - 0.5) * 2,
      height: (random() - 0.5) * 2.4,
      speed: 0.55 + random() * 0.1,
    }));
  }, []);

  useFrame((state, delta) => {
    const school = schoolRef.current;
    if (!school) return;
    sampleFrame(state.clock.elapsedTime, delta);
    school.getWorldPosition(center);
    // In the beam: push the school sideways out of it; otherwise drift home.
    const lit = litAmount(center);
    away
      .subVectors(center, searchlight.origin)
      .cross(searchlight.direction)
      .normalize()
      .multiplyScalar(lit * 6);
    scatter.lerp(away, Math.min(1, delta * (lit > 0 ? 3 : 0.8)));
  });

  return (
    <group ref={schoolRef} position={home}>
      {lanes.map((lane, index) => (
        <Fish key={index} lane={lane} scatter={scatter} />
      ))}
    </group>
  );
};
