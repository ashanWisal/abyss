"use client";

/**
 * @fileoverview The WebGL descent — "The Signal". You are the probe, flying a
 * spiral down around a light pulse coming from the floor.
 *
 * <DiveRig> flies the camera along the spiral (`pathPoint`), looking ahead
 * and a little in towards the signal; the pointer adds look-around, and in
 * the last chapter the view turns to face the source. It also retunes fog and
 * light to the water at the current depth. Everything else reads the same
 * smoothed depth from `sampleFrame`.
 *
 * Post-processing: bloom (every emissive light — the lure, the jellies, the
 * source — glows into the water) and a vignette.
 *
 * The render loop runs only while the canvas is on screen, and the pixel
 * ratio is capped: soft, foggy water gains nothing past ~1.5x.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { type AmbientLight, type DirectionalLight, FogExp2, PerspectiveCamera, Vector3 } from "three";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  baseView,
  sampleFrame,
  setAmbientMotion,
  setPointer,
  SIGNAL_POSITION,
  VIEW_PITCH,
} from "@/views/home/descent/descent-state";
import { Encounters } from "@/views/home/descent/encounters";
import { FishSchool } from "@/views/home/descent/fish-school";
import { Jellyfish } from "@/views/home/descent/jellyfish";
import { Obstacles } from "@/views/home/descent/obstacles";
import { Particles } from "@/views/home/descent/particles";
import { Probe } from "@/views/home/descent/probe";
import { SeaFloor } from "@/views/home/descent/sea-floor";
import { SignalSource } from "@/views/home/descent/signal-source";
import { Trench } from "@/views/home/descent/trench";
import { preloadModels } from "@/views/home/descent/use-model";
import { WaterBackdrop } from "@/views/home/descent/water-backdrop";

preloadModels(["probe", "fish", "whale", "jelly", "angler", "squid", "rock", "rocks", "shark"]);

/** Vertical field of view; wider on portrait screens, which are narrow. */
const FOV = 55;
const FOV_PORTRAIT = 72;
/** Pointer look-around, radians at the screen edge. */
const LOOK_YAW = 0.45;
const LOOK_PITCH = 0.25;
/** Depth (m) over which the view turns to face the source. */
const FACE_FROM = 3900;
const FACE_TO = 4150;

const position = new Vector3();
const toSource = new Vector3();

/** Yaw of a camera (which looks down -z) facing `direction`. */
const yawOf = (direction: Vector3) => Math.atan2(-direction.x, -direction.z);

const DiveRig = () => {
  const ambientRef = useRef<AmbientLight>(null);
  const sunRef = useRef<DirectionalLight>(null);

  useFrame((state, delta) => {
    const { camera, scene } = state;
    const fov = state.size.width < state.size.height ? FOV_PORTRAIT : FOV;
    if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const { depth, pointer, time, water } = sampleFrame(state.clock.elapsedTime, delta);

    // Look ahead along the spiral, turned a little in towards the signal.
    let yaw = baseView(depth, position);
    let pitch = VIEW_PITCH;
    camera.position.set(position.x, position.y + Math.sin(time * 0.23) * 0.2, position.z);

    // The last chapter: turn to face the source.
    const face = Math.min(Math.max((depth - FACE_FROM) / (FACE_TO - FACE_FROM), 0), 1);
    if (face > 0) {
      toSource.subVectors(SIGNAL_POSITION, camera.position);
      const sourceYaw = yawOf(toSource);
      const sourcePitch = Math.atan2(toSource.y, Math.hypot(toSource.x, toSource.z)) + 0.15;
      // Shortest way round.
      const turn = Math.atan2(Math.sin(sourceYaw - yaw), Math.cos(sourceYaw - yaw));
      const eased = face * face * (3 - 2 * face);
      yaw += turn * eased;
      pitch += (sourcePitch - pitch) * eased;
    }

    camera.rotation.set(pitch + pointer.y * LOOK_PITCH, yaw - pointer.x * LOOK_YAW, -pointer.x * 0.05, "YXZ");

    if (scene.fog instanceof FogExp2) {
      scene.fog.color.copy(water.fog);
      scene.fog.density = water.fogDensity;
    }
    if (ambientRef.current) {
      ambientRef.current.color.copy(water.top);
      ambientRef.current.intensity = water.ambient;
    }
    if (sunRef.current) {
      sunRef.current.intensity = water.sun * 2.5;
      sunRef.current.position.set(camera.position.x + 4, camera.position.y + 30, camera.position.z + 6);
    }
  });

  return (
    <>
      {/* Colour and density are retuned every frame from the water at depth. */}
      <fogExp2 attach="fog" args={[0x000000, 0.02]} />
      <ambientLight ref={ambientRef} />
      <directionalLight ref={sunRef} color="#e9fbff" />
    </>
  );
};

export const DescentCanvas = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setAmbientMotion(!reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // The view follows the pointer anywhere on the page — the captions and
  // header sit over the canvas, so listening on the canvas alone would miss it.
  useEffect(() => {
    const onMove = (event: PointerEvent) =>
      setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={wrapperRef} aria-hidden="true" className="absolute inset-0">
      <Canvas
        frameloop={onScreen ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 0.1, far: 160, position: [0, 0, 0] }}
      >
        <DiveRig />
        <WaterBackdrop />
        {/* Marine snow: the whole way down — the strongest sense of motion. */}
        <Particles count={1800} color="#d8f1ff" size={2.2} opacity={0.55} spread={44} height={44} sway={0.2} />
        {/* Bubbles near the surface, rising fast. */}
        <Particles count={160} color="#f2fdff" size={5} opacity={0.6} spread={28} height={30} rise={2.4} sway={0.35} depthBand={[0, 90, 80]} />
        {/* Krill and lanternfish glints through the twilight. */}
        <Particles count={500} color="#8fc4ff" size={3.6} opacity={0.8} spread={36} height={34} twinkle={0.5} sway={0.4} depthBand={[200, 1000, 200]} />
        {/* Bioluminescent sparks: the only light below 1000 m. */}
        <Particles count={700} color="#5ef2d6" size={9} opacity={1} spread={40} height={36} twinkle={1} sway={0.5} depthBand={[900, 4100, 300]} />
        <Trench />
        <Suspense fallback={null}>
          <Probe />
          <FishSchool />
          <Jellyfish />
          <Encounters />
          <Obstacles />
          <SeaFloor />
          <SignalSource />
        </Suspense>
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.75} luminanceSmoothing={0.2} intensity={1.1} radius={0.7} />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
