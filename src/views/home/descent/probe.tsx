"use client";

/**
 * @fileoverview The probe — you. The submarine rides just ahead of the
 * camera and banks towards the pointer; its searchlight (a real spot light
 * plus a visible beam) aims wherever the pointer is. The beam is published to
 * `searchlight` so creatures can react when it falls on them.
 *
 * The rig is a group that copies the camera every frame, so everything in it
 * is laid out in camera space: the probe sits a little below and ahead of
 * the lens, and the beam starts at its nose.
 *
 * It swerves round the obstacles crossing its route (`obstacles.tsx`).
 * Scrolling drives it: the propeller spins with scroll speed (backwards when
 * you scroll up), the hull rides a wave keyed to scroll position, and the
 * propeller's wash (`wake.tsx`) streams off the hub while it turns.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  type Group,
  type Mesh,
  Object3D,
  type SpotLight,
  Vector3,
} from "three";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";
import { probeAnchor, sampleFrame, searchlight } from "@/views/home/descent/descent-state";
import { dodgeAt } from "@/views/home/descent/obstacles";
import { useModel } from "@/views/home/descent/use-model";
import { propWash, Wake } from "@/views/home/descent/wake";

/** Probe placement in camera space: right of centre, clear of the headline. */
const PROBE_OFFSET = new Vector3(1.6, -0.3, -9);
/** Seen from behind three-quarters: nose into the dive, prop towards us. */
const PROBE_YAW = 0.6;
/** The model's nose points +z; turn it to face -z (into the screen). */
const NOSE_FORWARD: [number, number, number] = [0, Math.PI, 0];
/** Depth (m) over which the probe moves out of the way of the reveal. */
const ASIDE_FROM = 3900;
const ASIDE_TO = 4150;
/** The nose, in the probe's own space — where the beam starts. */
const NOSE = new Vector3(0, 0.1, -1.6);
const BEAM_LENGTH = 30;
const BEAM_RADIUS = Math.tan(0.32) * BEAM_LENGTH;

/** Propeller blades and hub, by glTF node name, and the hub's centre in model space (it spins about z). */
const PROPELLER = ["Box20179", "Box20180", "Box20181", "Cylinder002"];
const HUB_X = -1214.5;
const HUB_Y = 476.7;
/** The back face of the hub, where the wake starts. */
const HUB_Z = -2858;
/** Lenis velocity (px per frame) at which the propeller is at full speed. */
const FULL_THROTTLE = 25;
/** Propeller turns per second at full throttle. */
const PROP_SPEED = 4;
/** Hull wave: one crest per this many viewports scrolled. */
const WAVE_VIEWPORTS = 1.2;

const beamVertex = /* glsl */ `
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vAlong = position.z / ${BEAM_LENGTH.toFixed(1)};
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const beamFragment = /* glsl */ `
  uniform float uStrength;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Bright at the lamp, gone by the end; soft at the silhouette edges.
    float falloff = pow(1.0 - clamp(vAlong, 0.0, 1.0), 2.2);
    float edge = pow(abs(dot(vNormal, vView)), 1.5);
    gl_FragColor = vec4(vec3(0.75, 0.95, 1.0), falloff * edge * 0.22 * uStrength);
  }
`;

/** The spot light's aim point. One probe, so one module-level target. */
const target = new Object3D();
const worldNose = new Vector3();
const worldTarget = new Vector3();
const dodge = new Vector3();

export const Probe = () => {
  const rigRef = useRef<Group>(null);
  const probeRef = useRef<Group>(null);
  const spotRef = useRef<SpotLight>(null);
  const beamRef = useRef<Mesh>(null);
  const bladesRef = useRef<Object3D[]>([]);
  const propRef = useRef({ angle: 0, throttle: 0 });
  const model = useModel("probe", 3.2);

  // A cone with its apex at the origin, opening along +z (lookAt's forward).
  const beamGeometry = useMemo(
    () =>
      new ConeGeometry(BEAM_RADIUS, BEAM_LENGTH, 40, 1, true)
        .translate(0, -BEAM_LENGTH / 2, 0)
        .rotateX(-Math.PI / 2),
    [],
  );
  const beamParams = useMemo(
    () => ({
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      uniforms: { uStrength: { value: 1 } },
    }),
    [],
  );

  useFrame((state, delta) => {
    const rig = rigRef.current;
    const probe = probeRef.current;
    const spot = spotRef.current;
    const beam = beamRef.current;
    if (!rig || !probe || !spot || !beam) return;
    const { depth, pointer, time } = sampleFrame(state.clock.elapsedTime, delta);

    // Throttle follows scroll speed, spooling up fast and winding down slowly.
    const lenis = useScroll.getState().lenis;
    const velocity = lenis?.velocity ?? 0;
    const prop = propRef.current;
    const wanted = Math.min(Math.abs(velocity) / FULL_THROTTLE, 1) * Math.sign(velocity);
    prop.throttle += (wanted - prop.throttle) * Math.min(1, delta * (Math.abs(wanted) > Math.abs(prop.throttle) ? 6 : 1.5));
    prop.angle += prop.throttle * PROP_SPEED * Math.PI * 2 * delta;
    const throttle = Math.abs(prop.throttle);

    // Spin each blade about the hub: rotate, then shift back onto the axis.
    if (bladesRef.current.length === 0) {
      bladesRef.current = PROPELLER.flatMap((name) => probe.getObjectByName(name) ?? []);
    }
    const cos = Math.cos(prop.angle);
    const sin = Math.sin(prop.angle);
    for (const blade of bladesRef.current) {
      blade.rotation.z = prop.angle;
      blade.position.set(HUB_X - (cos * HUB_X - sin * HUB_Y), HUB_Y - (sin * HUB_X + cos * HUB_Y), 0);
    }

    // The hull rides a wave keyed to scroll position: it rises and falls as
    // you scroll, nose following the slope, and holds still when you stop.
    const phase = ((lenis?.animatedScroll ?? 0) / (state.size.height * WAVE_VIEWPORTS)) * Math.PI * 2;
    const wave = Math.sin(phase);
    const slope = Math.cos(phase);
    // At the floor the probe moves aside — down and right on desktop, where
    // the headline is top-right — so the source fills the view.
    const aside = Math.min(Math.max((depth - ASIDE_FROM) / (ASIDE_TO - ASIDE_FROM), 0), 1);

    rig.position.copy(state.camera.position);
    rig.quaternion.copy(state.camera.quaternion);

    // Bank and nose towards the pointer; bob gently in the swell.
    // Portrait screens see a narrow slice: set the probe further back and
    // nearer the middle so it is not cropped.
    const portrait = state.size.width < state.size.height;
    // Its resting spot, which the obstacles aim at…
    probeAnchor.set(
      portrait ? 0.6 : PROBE_OFFSET.x,
      PROBE_OFFSET.y + (portrait ? 3.5 : 0),
      portrait ? PROBE_OFFSET.z * 1.7 : PROBE_OFFSET.z,
    );
    // …then the swerve round whatever is crossing, the pointer, the wave.
    dodgeAt(depth, dodge);
    probe.position.set(
      probeAnchor.x + dodge.x + pointer.x * 1.1 + aside * (portrait ? 1.2 : 3.2),
      probeAnchor.y + dodge.y + pointer.y * 0.5 + Math.sin(time * 1.1) * 0.08 + wave * 0.7 + aside * (portrait ? 2.4 : -1.6),
      probeAnchor.z,
    );
    probe.rotation.set(
      pointer.y * 0.35 + slope * 0.22 + dodge.y * 0.08,
      PROBE_YAW - pointer.x * 0.6 + wave * 0.08 - dodge.x * 0.08,
      pointer.x * 0.35 + Math.sin(time * 0.8) * 0.04 + slope * 0.1 - dodge.z * 0.7,
    );
    rig.updateMatrixWorld();

    // The beam aims down the pointer's line of sight.
    target.position.set(pointer.x * 13, pointer.y * 8 - 2, -BEAM_LENGTH);
    rig.localToWorld(worldTarget.copy(target.position));
    probe.localToWorld(worldNose.copy(NOSE));
    spot.position.copy(worldNose);
    target.position.copy(worldTarget);
    target.updateMatrixWorld();
    beam.position.copy(worldNose);
    beam.lookAt(worldTarget);

    searchlight.origin.copy(worldNose);
    searchlight.direction.subVectors(worldTarget, worldNose).normalize();

    // Hand the wash its source: the hub, the shaft pointing back, the throttle.
    const hubMesh = bladesRef.current[bladesRef.current.length - 1];
    if (hubMesh?.parent) {
      // The meshes sit at the model origin; the hub is a point in their parent's space.
      hubMesh.parent.localToWorld(propWash.hub.set(HUB_X, HUB_Y, HUB_Z));
      propWash.axis.subVectors(propWash.hub, worldNose).normalize();
    }
    propWash.throttle = prop.throttle;
  });

  return (
    <>
      <group ref={rigRef}>
        <group ref={probeRef}>
          <group rotation={NOSE_FORWARD}>
            <primitive object={model} />
          </group>
          {/* Running lights so the hull reads even in black water. */}
          <pointLight position={[0, 1.2, 0.5]} color="#bfefff" intensity={6} distance={6} decay={1.5} />
        </group>
      </group>
      <spotLight
        ref={spotRef}
        target={target}
        color="#dff6ff"
        intensity={1400}
        angle={0.32}
        penumbra={0.6}
        distance={BEAM_LENGTH + 10}
        decay={1.2}
      />
      <primitive object={target} />
      <Wake />
      <mesh ref={beamRef} geometry={beamGeometry} frustumCulled={false} renderOrder={2}>
        <shaderMaterial args={[beamParams]} />
      </mesh>
    </>
  );
};
