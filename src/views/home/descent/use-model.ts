"use client";

/**
 * @fileoverview Load a glTF model ready to place in the dive.
 *
 * The downloaded models come at wildly different scales (a fish 0.05 units
 * long, a whale 660) and with off-centre origins, so every instance is
 * cloned, centred on its bounding box and scaled to `length` world units
 * along its longest side. Skinned models are cloned with SkeletonUtils so
 * each copy animates on its own; `clip` names the animation to loop.
 *
 * `glow` swaps the chosen materials (all, or those named in `glowOnly`) for
 * emissive copies tinted `glow`, and tags them on the wrapper — read them
 * back with `glowMaterials(object)` to pulse them each frame.
 *
 * Files live in `public/models/` — see the credits in `src/data/home.ts`.
 */

import { useEffect, useMemo } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  Group,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export type ModelName = "probe" | "whale" | "fish" | "jelly" | "angler" | "squid" | "rocks" | "rock" | "shark";

const url = (name: ModelName) => `/models/${name}.glb`;

const size = new Vector3();
const center = new Vector3();

export interface ModelOptions {
  /** Animation clip to loop, by name. */
  clip?: string;
  /** Emissive tint for glowing materials. */
  glow?: string;
  /** Only these material names glow; default all. */
  glowOnly?: string[];
  /** Opacity of glowing materials (jellies are see-through). */
  glowOpacity?: number;
}

const GLOW_KEY = "glowMaterials";

/** The glowing materials `useModel` tagged on a model (empty if none). */
export const glowMaterials = (object: Object3D): MeshStandardMaterial[] =>
  (object.userData[GLOW_KEY] as MeshStandardMaterial[] | undefined) ?? [];

const makeGlow = (source: Material, tint: Color, opacity: number) => {
  const base = source instanceof MeshStandardMaterial ? source.color : tint;
  return new MeshStandardMaterial({
    color: base.clone().lerp(tint, 0.5),
    emissive: tint,
    emissiveIntensity: 1,
    roughness: 0.4,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    toneMapped: false,
  });
};

export const useModel = (name: ModelName, length: number, options: ModelOptions = {}): Group => {
  const { clip, glow, glowOnly, glowOpacity = 1 } = options;
  const { scene, animations } = useGLTF(url(name));

  const { model, inner } = useMemo(() => {
    const copy: Object3D = clone(scene);
    // Precise bounds: skinned models (the fish, the angler) are posed by an
    // armature scaled 100x, so their raw geometry is not what renders.
    copy.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(copy, true);
    bounds.getSize(size);
    bounds.getCenter(center);
    const scale = length / Math.max(size.x, size.y, size.z);
    copy.position.copy(center).multiplyScalar(-scale);
    copy.scale.setScalar(scale);

    const glowing: MeshStandardMaterial[] = [];
    if (glow) {
      const tint = new Color(glow);
      copy.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        const swap = (material: Material) => {
          if (glowOnly && !glowOnly.includes(material.name)) return material;
          const replacement = makeGlow(material, tint, glowOpacity);
          glowing.push(replacement);
          return replacement;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
      });
    }

    const wrapper = new Group();
    wrapper.add(copy);
    wrapper.userData[GLOW_KEY] = glowing;
    return { model: wrapper, inner: copy };
  }, [scene, length, glow, glowOnly, glowOpacity]);

  const { actions } = useAnimations(animations, inner);
  useEffect(() => {
    if (!clip) return;
    const action = actions[clip];
    action?.reset().play();
    return () => {
      action?.stop();
    };
  }, [actions, clip]);

  return model;
};

/** Start fetching models as soon as the scene module loads. */
export const preloadModels = (names: ModelName[]) =>
  names.forEach((name) => useGLTF.preload(url(name)));
