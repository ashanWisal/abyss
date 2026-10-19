"use client";

/**
 * @fileoverview A field of soft glowing points — the marine snow, the surface
 * bubbles, the bioluminescent sparks and the vent smoke are all this.
 *
 * Points live in a box `spread` wide and `height` tall and wrap vertically in
 * the vertex shader, so a small fixed buffer reads as an endless column.
 *
 * - `follow` keeps the box centred on the camera and shifts the wrap by the
 *   camera's own travel on all three axes: the field stays put in the world
 *   while the camera flies through it, so the points stream past — the
 *   strongest cue that you are moving.
 * - Without `follow` the box sits at `position` (a vent's smoke column).
 *
 * `depthBand` fades the whole field in and out around a depth range.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { band, sampleFrame, seededRandom } from "@/views/home/descent/descent-state";

const vertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uShift;
  uniform vec3 uBox;
  uniform float uSize;
  uniform float uRise;
  uniform float uSway;
  uniform float uTwinkle;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p += uShift;
    p.y += uTime * uRise * (0.6 + aSeed);
    p = mod(p, uBox) - uBox * 0.5;
    p.x += sin(uTime * 0.4 + aSeed * 6.2831) * uSway;
    p.z += cos(uTime * 0.3 + aSeed * 12.566) * uSway;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio * (24.0 / -mv.z);

    // Fade near the wrap edges and with distance, so nothing pops.
    vec3 fromEdge = 0.5 - abs(p / uBox);
    float edge = smoothstep(0.0, 0.12, min(min(fromEdge.x, fromEdge.y), fromEdge.z));
    float distance = smoothstep(60.0, 8.0, -mv.z);
    float blink = mix(1.0, pow(0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 4.0) + aSeed * 40.0), 4.0), uTwinkle);
    vAlpha = edge * distance * blink;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * uOpacity * vAlpha);
  }
`;

export interface ParticlesProps {
  count: number;
  color: string;
  /** Point size at ~24 units away. */
  size: number;
  /** Peak opacity, 0-1. */
  opacity: number;
  /** Box footprint (x and z) and height, world units. */
  spread: number;
  height: number;
  /** Upward drift in units per second (bubbles, smoke). */
  rise?: number;
  /** Side-to-side wander, world units. */
  sway?: number;
  /** 0 steady glow, 1 blinking like bioluminescence. */
  twinkle?: number;
  follow?: boolean;
  /** World position of a fixed (non-following) box. */
  position?: [number, number, number];
  /** [from, to, fade] in metres; the field is invisible outside it. */
  depthBand?: [number, number, number];
}

export const Particles = ({
  count,
  color,
  size,
  opacity,
  spread,
  height,
  rise = 0,
  sway = 0.15,
  twinkle = 0,
  follow = true,
  position = [0, 0, 0],
  depthBand,
}: ParticlesProps) => {
  const pointsRef = useRef<Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    // Seeded, so the field is identical on every visit.
    const random = seededRandom(count * 9301 + height * 49297);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = random() * spread;
      positions[i * 3 + 1] = random() * height;
      positions[i * 3 + 2] = random() * spread;
      seeds[i] = random();
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return result;
  }, [count, spread, height]);

  const materialRef = useRef<ShaderMaterial>(null);
  const params = useMemo(
    () => ({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(color) },
          uOpacity: { value: opacity },
          uTime: { value: 0 },
          uShift: { value: new Vector3() },
          uBox: { value: new Vector3(spread, height, spread) },
          uSize: { value: size },
          uRise: { value: rise },
          uSway: { value: sway },
          uTwinkle: { value: twinkle },
          uPixelRatio: { value: 1 },
        },
    }),
    [color, opacity, spread, height, size, rise, sway, twinkle],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;
    const { depth, time } = sampleFrame(state.clock.elapsedTime, delta);
    const visible = depthBand ? band(depth, ...depthBand) : 1;
    points.visible = visible > 0;
    if (!points.visible) return;
    const u = material.uniforms;
    u.uTime.value = time;
    u.uOpacity.value = opacity * visible;
    u.uPixelRatio.value = state.viewport.dpr;
    if (follow) {
      points.position.copy(state.camera.position);
      u.uShift.value.copy(state.camera.position).negate();
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      position={follow ? undefined : position}
      frustumCulled={false}
    >
      <shaderMaterial ref={materialRef} args={[params]} />
    </points>
  );
};
