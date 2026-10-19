"use client";

/**
 * @fileoverview The bottom of the dive: a rolling seabed around the signal's
 * source, black-smoker chimneys glowing at the throat with smoke boiling up
 * from each, and a ring of boulders. Lit only by the vents, the source and
 * the probe's searchlight — at 4000 m there is no other light.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, type Mesh, PlaneGeometry, type PointLight } from "three";
import { band, FLOOR_Y, sampleFrame, seededRandom } from "@/views/home/descent/descent-state";
import { Particles } from "@/views/home/descent/particles";
import { type ModelName, useModel } from "@/views/home/descent/use-model";
import { MAX_DEPTH } from "@/views/home/dive-store";

/** The floor and its lights fade in over the last part of the dive. */
const FLOOR_BAND: [number, number, number] = [3900, MAX_DEPTH + 500, 400];

/** Rolling dunes from a few summed sines — cheap, seamless, no texture. */
const seabedHeight = (x: number, z: number) =>
  Math.sin(x * 0.18) * 0.9 +
  Math.sin(z * 0.23 + x * 0.07) * 0.7 +
  Math.sin(x * 0.61 + z * 0.43) * 0.25;

interface VentSpec {
  x: number;
  z: number;
  height: number;
}

/** Around the source at the axis, so the final approach passes between them. */
const VENTS: VentSpec[] = [
  { x: 7, z: 3, height: 6 },
  { x: -6, z: 6, height: 8.5 },
  { x: -3, z: -8, height: 4.5 },
  { x: 9, z: -7, height: 7 },
];

const Vent = ({ spec }: { spec: VentSpec }) => {
  const lightRef = useRef<PointLight>(null);
  // A lumpy, tapering chimney: a cylinder whose rings are jittered.
  const geometry = useMemo(() => {
    const result = new CylinderGeometry(0.5, 1.4, spec.height, 10, 12);
    const position = result.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i);
      const jitter = 1 + Math.sin(y * 3.1 + i) * 0.12;
      position.setX(i, position.getX(i) * jitter);
      position.setZ(i, position.getZ(i) * jitter);
    }
    result.computeVertexNormals();
    return result;
  }, [spec.height]);
  const baseY = FLOOR_Y + seabedHeight(spec.x, spec.z);
  const topY = baseY + spec.height;

  useFrame((state, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const { depth, time } = sampleFrame(state.clock.elapsedTime, delta);
    // Flicker: the throat of a vent is never steady.
    const flicker = 0.85 + Math.sin(time * 7 + spec.x) * 0.08 + Math.sin(time * 13 + spec.z) * 0.07;
    light.intensity = 40 * flicker * band(depth, ...FLOOR_BAND);
  });

  return (
    <group>
      <mesh geometry={geometry} position={[spec.x, baseY + spec.height / 2, spec.z]}>
        <meshStandardMaterial color="#2b2622" roughness={0.95} emissive="#ff6a1f" emissiveIntensity={0.04} />
      </mesh>
      <pointLight ref={lightRef} position={[spec.x, topY + 0.4, spec.z]} color="#ff8a3d" distance={18} decay={1.6} />
      {/* The throat's glow, then the smoke column rising out of it. */}
      <Particles
        count={40}
        color="#ffb36b"
        size={10}
        opacity={0.7}
        spread={0.8}
        height={1.2}
        rise={0.6}
        follow={false}
        position={[spec.x, topY + 0.3, spec.z]}
        depthBand={FLOOR_BAND}
      />
      <Particles
        count={260}
        color="#d39a72"
        size={16}
        opacity={0.22}
        spread={1.6}
        height={16}
        rise={1.8}
        sway={0.6}
        follow={false}
        position={[spec.x, topY + 8, spec.z]}
        depthBand={FLOOR_BAND}
      />
    </group>
  );
};

interface BoulderSpec {
  model: ModelName;
  x: number;
  z: number;
  size: number;
  turn: number;
}

/** A loose ring of boulders around the source, seeded so it never reshuffles. */
const BOULDERS: BoulderSpec[] = (() => {
  const random = seededRandom(23);
  return Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 14) * Math.PI * 2 + random() * 0.4;
    const radius = 11 + random() * 16;
    return {
      model: index % 3 === 0 ? "rocks" : "rock",
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      size: 2 + random() * 4,
      turn: random() * Math.PI * 2,
    };
  });
})();

const Boulder = ({ spec }: { spec: BoulderSpec }) => {
  const model = useModel(spec.model, spec.size);
  return (
    <group position={[spec.x, FLOOR_Y + seabedHeight(spec.x, spec.z) + spec.size * 0.25, spec.z]} rotation={[0, spec.turn, 0]}>
      <primitive object={model} />
    </group>
  );
};

export const SeaFloor = () => {
  const floorRef = useRef<Mesh>(null);

  const geometry = useMemo(() => {
    const result = new PlaneGeometry(160, 160, 120, 120).rotateX(-Math.PI / 2);
    const position = result.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      position.setY(i, seabedHeight(position.getX(i), position.getZ(i)));
    }
    result.computeVertexNormals();
    return result;
  }, []);

  useFrame((state, delta) => {
    const { depth } = sampleFrame(state.clock.elapsedTime, delta);
    if (floorRef.current) floorRef.current.visible = band(depth, ...FLOOR_BAND) > 0;
  });

  return (
    <group>
      <mesh ref={floorRef} geometry={geometry} position={[0, FLOOR_Y, 0]}>
        <meshStandardMaterial color="#4a4f49" roughness={1} />
      </mesh>
      {BOULDERS.map((spec, index) => (
        <Boulder key={index} spec={spec} />
      ))}
      {VENTS.map((spec) => (
        <Vent key={`${spec.x}-${spec.z}`} spec={spec} />
      ))}
    </group>
  );
};
