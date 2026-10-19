"use client";

/**
 * @fileoverview The field-log stage: the creature you are reading about,
 * turning slowly on a dark stage — the same models the dive uses, lit like a
 * specimen and glowing where it makes its own light.
 *
 * Every specimen stays mounted; the active one grows in with a half turn and
 * the rest shrink away, so switching costs no model loading. The pointer
 * over the stage turns the specimen further, so you can look around it.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { Group } from "three";
import type { Creature } from "@/data/home";
import { signalPulse } from "@/views/home/descent/descent-state";
import { glowMaterials, useModel } from "@/views/home/descent/use-model";

/** Longest side of every specimen, world units — sizes are in the copy. */
const LENGTH = 4.4;
const CLIPS: Partial<Record<Creature["model"], string>> = {
  fish: "Armature|Swim",
  angler: "Fish_Armature|Swimming_Normal",
};

interface SpecimenProps {
  creature: Creature;
  active: boolean;
  /** The source pulses the signal; other glowing creatures just breathe. */
  signal: boolean;
}

const Specimen = ({ creature, active, signal }: SpecimenProps) => {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const shownRef = useRef(0);
  const model = useModel(creature.model, LENGTH, {
    clip: CLIPS[creature.model],
    glow: creature.glow,
    glowOnly: creature.glowOnly,
    glowOpacity: creature.model === "jelly" ? 0.85 : 1,
  });

  useFrame((state, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;
    shownRef.current += ((active ? 1 : 0) - shownRef.current) * Math.min(1, delta * 4);
    const shown = shownRef.current;
    group.visible = shown > 0.01;
    if (!group.visible) return;

    const time = state.clock.elapsedTime;
    group.scale.setScalar(shown * shown * (3 - 2 * shown));
    group.position.y = Math.sin(time * 0.8) * 0.12;
    group.rotation.set(0.15 + state.pointer.y * -0.2, time * 0.25 + state.pointer.x * 0.9 + (1 - shown) * Math.PI, 0);

    const glow = signal ? 0.6 + signalPulse(time) * 4 : 1 + Math.sin(time * 1.6) * 0.4;
    for (const material of glowMaterials(body)) material.emissiveIntensity = glow;
  });

  return (
    <group ref={groupRef}>
      <primitive ref={bodyRef} object={model} />
    </group>
  );
};

export interface SpecimenCanvasProps {
  creatures: Creature[];
  current: number;
}

export const SpecimenCanvas = ({ creatures, current }: SpecimenCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} aria-hidden="true" className="absolute inset-0">
      <Canvas
        frameloop={onScreen ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        camera={{ fov: 32, position: [0, 0.4, 10] }}
      >
        <ambientLight color="#9fd8ff" intensity={1.1} />
        {/* Key from above-front, a cyan rim behind, a warm fill from below. */}
        <directionalLight color="#e9fbff" intensity={2.6} position={[3, 5, 6]} />
        <directionalLight color="#5ef2d6" intensity={3.5} position={[-4, 2, -6]} />
        <pointLight color="#ff8a3d" intensity={8} distance={12} position={[0, -4, 2]} />
        <Suspense fallback={null}>
          {creatures.map((creature, index) => (
            <Specimen
              key={creature.name}
              creature={creature}
              active={index === current}
              signal={index === creatures.length - 1}
            />
          ))}
        </Suspense>
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.75} luminanceSmoothing={0.2} intensity={1.1} radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
