"use client";

/**
 * @fileoverview The dive's set pieces, each placed just off the flight path
 * where its chapter happens:
 *
 * - <Whale> (twilight): a sperm whale gliding across the route on its way
 *   down to hunt — huge, slow, indifferent to the probe.
 * - <Anglerfish> (midnight): the false lead. Its lure flashes in the
 *   signal's own rhythm, and it turns to face the probe as it closes in.
 * - <Squid> (midnight): jets away when the searchlight finds it.
 * - <Siphonophore>: a colony strung out like a glowing necklace, the wave
 *   running down its length.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
  type PointLight,
  SphereGeometry,
  Vector3,
} from "three";
import {
  litAmount,
  pathHeading,
  pathPoint,
  sampleFrame,
  signalPulse,
} from "@/views/home/descent/descent-state";
import { glowMaterials, useModel } from "@/views/home/descent/use-model";

/** Scratch objects for per-frame maths. */
const dummy = new Object3D();
const worldPosition = new Vector3();
const heading = new Vector3();

/** Yaw that points a +z-forward model along `direction`. */
const yawAlong = (direction: Vector3) => Math.atan2(direction.x, direction.z);

const placed = (depth: number, inward: number, up: number) =>
  pathPoint(depth, new Vector3(), inward, up).toArray();

const WHALE_DEPTH = 520;

const Whale = () => {
  const groupRef = useRef<Group>(null);
  const model = useModel("whale", 24);
  const home = useMemo(() => placed(WHALE_DEPTH, -7, -3), []);
  const yaw = useMemo(() => yawAlong(pathHeading(WHALE_DEPTH, heading)) + 0.5, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { time } = sampleFrame(state.clock.elapsedTime, delta);
    // A slow glide back and forth across the route, rising and dipping.
    const glide = Math.sin(time * 0.06) * 10;
    group.position.set(
      home[0] + Math.sin(yaw) * glide,
      home[1] + Math.sin(time * 0.2) * 0.8,
      home[2] + Math.cos(yaw) * glide,
    );
    group.rotation.set(Math.sin(time * 0.2) * 0.04, yaw + (Math.cos(time * 0.06) < 0 ? Math.PI : 0), 0);
  });

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
};

const ANGLER_DEPTH = 2350;
const ANGLER_LURE = ["Light", "Anglerfish_Light"];

const Anglerfish = () => {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const model = useModel("angler", 5.5, {
    clip: "Fish_Armature|Swimming_Normal",
    glow: "#9ffff0",
    glowOnly: ANGLER_LURE,
  });
  // Inward reads as screen-left: up and left, clear of the copy.
  const home = useMemo(() => placed(ANGLER_DEPTH, 4, 3.5), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    const light = lightRef.current;
    if (!group || !body || !light) return;
    const { time } = sampleFrame(state.clock.elapsedTime, delta);
    group.position.set(home[0], home[1] + Math.sin(time * 0.5) * 0.3, home[2]);
    // Turn to face the probe as it comes near.
    worldPosition.copy(state.camera.position).sub(group.position);
    group.rotation.y += (Math.atan2(worldPosition.x, worldPosition.z) - group.rotation.y) * Math.min(1, delta);
    // The mimicry: its lure flashes the signal's rhythm.
    const pulse = signalPulse(time + 0.15);
    for (const material of glowMaterials(body)) material.emissiveIntensity = 0.6 + pulse * 5;
    light.intensity = 3 + pulse * 22;
  });

  return (
    <group ref={groupRef}>
      <primitive ref={bodyRef} object={model} />
      <pointLight ref={lightRef} position={[0, 1.6, 1.2]} color="#9ffff0" distance={10} decay={1.4} />
    </group>
  );
};

const SQUID_DEPTH = 3150;

const Squid = () => {
  const groupRef = useRef<Group>(null);
  const fleeRef = useRef(0);
  const model = useModel("squid", 8);
  const home = useMemo(() => placed(SQUID_DEPTH, -4, 1), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { time } = sampleFrame(state.clock.elapsedTime, delta);
    group.getWorldPosition(worldPosition);
    // Once lit it jets off, and drifts back only slowly.
    const lit = litAmount(worldPosition);
    fleeRef.current = Math.min(1, Math.max(0, fleeRef.current + (lit > 0.05 ? delta * 1.5 : -delta * 0.15)));
    const flee = fleeRef.current;
    group.position.set(home[0], home[1] + flee * 10 + Math.sin(time * 0.6) * 0.3, home[2] - flee * 4);
    group.rotation.set(-Math.PI / 2 + Math.sin(time * 1.2) * 0.08, time * 0.1, 0);
  });

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
};

interface SiphonophoreProps {
  depth: number;
  inward: number;
  up: number;
  length: number;
  color: string;
}

const BEADS = 140;

const Siphonophore = ({ depth, inward, up, length, color }: SiphonophoreProps) => {
  const meshRef = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new SphereGeometry(0.07, 8, 6), []);
  const home = useMemo(() => placed(depth, inward, up), [depth, inward, up]);
  const yaw = useMemo(() => yawAlong(pathHeading(depth, new Vector3())), [depth]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { time } = sampleFrame(state.clock.elapsedTime, delta);
    for (let i = 0; i < BEADS; i += 1) {
      const t = i / (BEADS - 1);
      dummy.position.set(
        Math.sin(t * 9 - time * 1.2) * 0.6 + Math.sin(t * 3.1 + time * 0.4) * 1.2,
        Math.cos(t * 7 - time * 0.9) * 0.5,
        (t - 0.5) * length,
      );
      // Beads swell in turn, like pulses running down the colony.
      dummy.scale.setScalar(0.7 + 0.8 * Math.max(0, Math.sin(t * 40 - time * 3)));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    (mesh.material as MeshBasicMaterial).opacity = 0.9;
  });

  return (
    <group position={home} rotation={[0.25, yaw + 0.6, 0]}>
      <instancedMesh ref={meshRef} args={[geometry, undefined, BEADS]} frustumCulled={false}>
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

export const Encounters = () => (
  <>
    <Whale />
    <Siphonophore depth={1500} inward={-5} up={1} length={26} color="#7fd8ff" />
    <Anglerfish />
    <Squid />
    <Siphonophore depth={3700} inward={5} up={-1} length={22} color="#ff9fd8" />
  </>
);
