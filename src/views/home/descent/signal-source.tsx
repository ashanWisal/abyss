"use client";

/**
 * @fileoverview The signal, and what is making it.
 *
 * The beacon is a bright core at the spiral's axis on the floor, pulsing in
 * the signal's rhythm (`signalPulse`). It ignores fog, so from high up it is a
 * faint point far below — the thing the whole dive is chasing — and it grows
 * as the probe closes in. In the last chapter the light resolves into what is
 * really there: a colossal jellyfish, glowing in the same rhythm, lighting
 * the floor around it.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial, type PointLight } from "three";
import { band, sampleFrame, SIGNAL_POSITION, signalPulse } from "@/views/home/descent/descent-state";
import { glowMaterials, useModel } from "@/views/home/descent/use-model";
import { MAX_DEPTH } from "@/views/home/dive-store";

/** The source is revealed over the floor chapter. */
const REVEAL: [number, number, number] = [4000, MAX_DEPTH + 500, 250];
const SOURCE_TINT = "#5ef2d6";

export const SignalSource = () => {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const creatureRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const creature = useModel("jelly", 20, { glow: SOURCE_TINT, glowOpacity: 0.85 });

  useFrame((state, delta) => {
    const core = coreRef.current;
    const halo = haloRef.current;
    const light = lightRef.current;
    const holder = creatureRef.current;
    const body = bodyRef.current;
    if (!core || !halo || !light || !holder || !body) return;
    const { depth, time } = sampleFrame(state.clock.elapsedTime, delta);
    const pulse = signalPulse(time);
    // Signal strength: a faint point at the surface, overwhelming at the floor.
    const strength = 0.15 + 0.85 * (depth / MAX_DEPTH) ** 2;
    const reveal = band(depth, ...REVEAL);

    core.scale.setScalar(0.6 + pulse * 0.5);
    halo.scale.setScalar((2 + pulse * 3) * (0.6 + strength));
    (halo.material as MeshBasicMaterial).opacity = (0.15 + pulse * 0.5) * strength;
    light.intensity = (40 + pulse * 260) * reveal;

    holder.visible = reveal > 0;
    holder.rotation.y = time * 0.05;
    holder.position.y = Math.sin(time * 0.4) * 0.4;
    const swell = 1 + Math.sin(time * 0.9) * 0.03;
    holder.scale.set(1 / swell, swell, 1 / swell);
    for (const material of glowMaterials(body)) {
      material.emissiveIntensity = (0.35 + pulse * 2.4) * reveal;
      material.opacity = 0.85 * reveal;
    }
  });

  return (
    <group position={SIGNAL_POSITION}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 24, 16]} />
        <meshBasicMaterial color="#c9fff4" toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={haloRef} renderOrder={3}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial
          color={SOURCE_TINT}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <pointLight ref={lightRef} color={SOURCE_TINT} distance={60} decay={1.3} />
      {/* The creature hangs above its glowing core; the bell's underside is the light. */}
      <group ref={creatureRef}>
        <group position={[0, 7, 0]}>
          <primitive ref={bodyRef} object={creature} />
        </group>
      </group>
    </group>
  );
};
