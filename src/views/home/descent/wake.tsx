"use client";

/**
 * @fileoverview The propeller wash behind the probe.
 *
 * Two layers, spawned at the hub while the propeller turns:
 * - **Bubbles**: hundreds of tiny ones, thrown back in a jet and spun round
 *   the shaft by the blades (a corkscrew), then slowing, spreading, wobbling
 *   and drifting up. Each has its own size and life, so the stream reads as
 *   fizz, not as a row of dots.
 * - **Churn**: a few large, very faint soft puffs — the disturbed water the
 *   jet leaves behind — swelling as they fade.
 *
 * Everything is in world space, but each particle starts with most of the
 * probe's own velocity (the water round a hull is dragged along with it) and
 * loses it to drag, so the wash peels away behind the probe instead of
 * vanishing off screen the moment it is born. The probe publishes the hub, the shaft direction and the throttle
 * to `propWash` each frame.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Points, Vector3 } from "three";

/** Written by the probe every frame. */
export const propWash = {
  hub: new Vector3(),
  /** Unit vector pointing back, out of the propeller. */
  axis: new Vector3(0, 0, 1),
  /** 0-1, signed: negative when the propeller runs backwards. */
  throttle: 0,
};

const BUBBLES = 1400;
const CHURN = 90;
const COUNT = BUBBLES + CHURN;
/** Spawned per second at full throttle. */
const BUBBLE_RATE = 650;
const CHURN_RATE = 45;
/** Share of the probe's velocity a new particle carries. */
const CARRY = 0.85;
/** Radius of the blade tips, world units — bubbles start round the disc. */
const DISC = 0.35;

const vertex = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  attribute float aKind;
  varying float vLife;
  varying float vKind;
  void main() {
    vLife = aLife;
    vKind = aKind;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Bubbles grow a little as they rise; churn swells as it fades.
    float grow = aKind > 0.5 ? 0.3 + (1.0 - aLife) * 2.5 : 0.7 + (1.0 - aLife) * 0.6;
    gl_PointSize = aLife > 0.0 ? aSize * grow * 1200.0 / -mv.z : 0.0;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  varying float vLife;
  varying float vKind;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // Fade in just out of the propeller, out at the end of life.
    float life = smoothstep(0.0, 0.35, vLife) * smoothstep(1.0, 0.97, vLife);
    if (vKind > 0.5) {
      float puff = exp(-d * d * 14.0);
      gl_FragColor = vec4(vec3(0.75, 0.9, 0.95), puff * life * 0.035);
      return;
    }
    // A small sphere: soft body, darker rim, a pin of light up and left.
    float body = smoothstep(0.5, 0.3, d);
    float rim = smoothstep(0.32, 0.48, d) * body;
    float glint = smoothstep(0.16, 0.0, length(c - vec2(-0.14, -0.14)));
    vec3 color = mix(vec3(0.72, 0.88, 0.95), vec3(1.0), glint);
    gl_FragColor = vec4(color, (body * 0.35 + rim * 0.4 + glint * 0.6) * life);
  }
`;

/** One wake, so module-level buffers the frame loop owns. */
const positions = new Float32Array(COUNT * 3);
const velocities = new Float32Array(COUNT * 3);
const life = new Float32Array(COUNT);
/** Life lost per second. */
const fade = new Float32Array(COUNT);
const sizes = new Float32Array(COUNT);
const kinds = new Float32Array(COUNT).fill(1, BUBBLES);
const spawn = { bubble: 0, churn: BUBBLES, owedBubbles: 0, owedChurn: 0 };

const side = new Vector3();
const carried = new Vector3();
const lastHub = new Vector3();
const lift = new Vector3();
const UP = new Vector3(0, 1, 0);

const emit = (i: number, churn: boolean, push: number, spin: number) => {
  const { hub, axis } = propWash;
  const angle = Math.random() * Math.PI * 2;
  const radius = churn ? Math.random() * DISC : DISC * (0.4 + Math.random() * 0.6);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Out from the shaft (radial) and round it (tangential), in world space.
  const rx = side.x * cos + lift.x * sin;
  const ry = side.y * cos + lift.y * sin;
  const rz = side.z * cos + lift.z * sin;
  const tx = -side.x * sin + lift.x * cos;
  const ty = -side.y * sin + lift.y * cos;
  const tz = -side.z * sin + lift.z * cos;
  positions.set([hub.x + rx * radius, hub.y + ry * radius, hub.z + rz * radius], i * 3);
  const jet = push * (churn ? 0.6 : 0.7 + Math.random() * 0.6);
  const swirl = spin * radius * (churn ? 0.3 : 1);
  velocities.set(
    [
      carried.x + axis.x * jet + tx * swirl + rx * 0.3,
      carried.y + axis.y * jet + ty * swirl + ry * 0.3,
      carried.z + axis.z * jet + tz * swirl + rz * 0.3,
    ],
    i * 3,
  );
  life[i] = 1;
  fade[i] = churn ? 0.55 : 0.45 + Math.random() * 0.5;
  sizes[i] = churn ? 0.5 + Math.random() * 0.4 : 0.018 + Math.random() ** 3 * 0.07;
};

export const Wake = () => {
  const pointsRef = useRef<Points>(null);
  const params = useMemo(
    () => ({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false }),
    [],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const throttle = Math.abs(propWash.throttle);
    const time = state.clock.elapsedTime;
    // The probe's velocity; a jump (first frame, a reload mid-page) carries nothing.
    carried.subVectors(propWash.hub, lastHub).divideScalar(Math.max(delta, 1e-3));
    if (carried.lengthSq() > 2500) carried.set(0, 0, 0);
    carried.multiplyScalar(CARRY);
    lastHub.copy(propWash.hub);

    // A frame round the shaft, for the corkscrew.
    side.crossVectors(propWash.axis, UP).normalize();
    lift.crossVectors(side, propWash.axis);
    const push = 1.5 + throttle * 5;
    const spin = Math.sign(propWash.throttle) * 9;

    spawn.owedBubbles += throttle * BUBBLE_RATE * delta;
    spawn.owedChurn += throttle * CHURN_RATE * delta;
    for (; spawn.owedBubbles >= 1; spawn.owedBubbles -= 1) {
      emit(spawn.bubble, false, push, spin);
      spawn.bubble = (spawn.bubble + 1) % BUBBLES;
    }
    for (; spawn.owedChurn >= 1; spawn.owedChurn -= 1) {
      emit(spawn.churn, true, push, spin);
      spawn.churn = spawn.churn + 1 >= COUNT ? BUBBLES : spawn.churn + 1;
    }

    const drag = Math.exp(-delta * 1.6);
    for (let i = 0; i < COUNT; i += 1) {
      if (life[i] <= 0) continue;
      life[i] = Math.max(0, life[i] - fade[i] * delta);
      const v = i * 3;
      // Small bubbles rise slower; all of them wobble as they go.
      const buoyancy = kinds[i] > 0.5 ? 0.15 : 0.4 + sizes[i] * 20;
      const wobble = Math.sin(time * 9 + i * 1.7) * 0.6 * delta;
      velocities[v] = velocities[v] * drag + wobble;
      velocities[v + 1] = velocities[v + 1] * drag + buoyancy * delta;
      velocities[v + 2] = velocities[v + 2] * drag + Math.cos(time * 8 + i * 2.3) * 0.6 * delta;
      positions[v] += velocities[v] * delta;
      positions[v + 1] += velocities[v + 1] * delta;
      positions[v + 2] += velocities[v + 2] * delta;
    }
    const { attributes } = points.geometry;
    attributes.position.needsUpdate = true;
    attributes.aLife.needsUpdate = true;
    attributes.aSize.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={3}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aLife" args={[life, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aKind" args={[kinds, 1]} />
      </bufferGeometry>
      <shaderMaterial args={[params]} />
    </points>
  );
};
