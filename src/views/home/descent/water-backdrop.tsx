"use client";

/**
 * @fileoverview The water itself — a full-screen shader drawn behind
 * everything: a vertical gradient (light from above), slanted sun rays and
 * shimmering caustics near the surface. Both fade out with depth through
 * `water.sun`, so by the midnight zone only the dark gradient is left.
 *
 * Drawn in clip space at the far plane, so it never moves with the camera
 * and never hides the scene.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";
import { sampleFrame } from "@/views/home/descent/descent-state";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uSun;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec3 color = mix(uBottom, uTop, pow(uv.y, 1.6));

    // Sun rays: soft slanted bands, brightest at the top, swaying slowly.
    float x = (uv.x - 0.5) * uAspect + (1.0 - uv.y) * 0.35;
    float rays = 0.0;
    rays += pow(0.5 + 0.5 * sin(x * 9.0 + uTime * 0.25), 6.0);
    rays += 0.6 * pow(0.5 + 0.5 * sin(x * 15.0 - uTime * 0.18 + 1.7), 8.0);
    rays += 0.4 * pow(0.5 + 0.5 * sin(x * 23.0 + uTime * 0.12 + 4.1), 10.0);
    rays *= smoothstep(0.05, 1.0, uv.y);

    // Caustics: a fine net of interfering ripples, only along the top band.
    vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y * 2.0) * 22.0;
    float c = sin(p.x + sin(p.y * 0.8 + uTime * 0.6) * 1.5)
            + sin(p.y * 1.1 + sin(p.x * 0.7 - uTime * 0.5) * 1.5);
    float caustics = pow(1.0 - abs(c) * 0.5, 14.0) * smoothstep(0.8, 1.0, uv.y);

    color += uTop * (rays * 0.35 + caustics * 0.35) * uSun;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const WaterBackdrop = () => {
  const materialRef = useRef<ShaderMaterial>(null);
  const params = useMemo(
    () => ({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color() },
        uBottom: { value: new Color() },
        uSun: { value: 1 },
        uTime: { value: 0 },
        uAspect: { value: 1 },
      },
    }),
    [],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const { water, time } = sampleFrame(state.clock.elapsedTime, delta);
    const u = material.uniforms;
    u.uTop.value.copy(water.top);
    u.uBottom.value.copy(water.bottom);
    u.uSun.value = water.sun;
    u.uTime.value = time;
    u.uAspect.value = state.size.width / state.size.height;
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} args={[params]} />
    </mesh>
  );
};
