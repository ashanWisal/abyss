"use client";

/**
 * @fileoverview The trench between chapters 01 and 02: two rock walls that
 * rise either side of the route, close in around 200 m and open out again,
 * so the probe dives down a canyon.
 *
 * Each wall is one generated mesh that follows the spiral: for every step
 * along the route it takes the path point and its sideways direction, then
 * stacks a column of vertices up and down from there, pushed in and out by
 * layered noise (crags and horizontal strata) and cut off at a ragged
 * ridge line. Flat shading gives the same faceted look as the models.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, type Group, Vector3 } from "three";
import {
  depthAtTravel,
  pathHeading,
  pathPoint,
  sampleFrame,
} from "@/views/home/descent/descent-state";

/** Route units the trench runs over, and where it is narrowest (200 m). */
const FROM = 62;
const TO = 136;
const NARROWEST = 100;
/** Half-width of the canyon at its narrowest and at its mouths. */
const WIDTH_MIN = 13;
const WIDTH_MAX = 34;
/** Wall height above and below the route, before the ragged ridge. */
const ABOVE = 22;
const BELOW = 48;
const ALONG_STEPS = 150;
const UP_STEPS = 46;

const UP = new Vector3(0, 1, 0);
const TOP = new Color("#4d636b");
const DEEP = new Color("#121c22");
const color = new Color();

/** Cheap smooth value noise in 2D, and three octaves of it. */
const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const noise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const fbm = (x: number, y: number) =>
  noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15;

/** One wall; `side` is +1 or -1 across the route. */
const buildWall = (side: number) => {
  const columns = ALONG_STEPS + 1;
  const rows = UP_STEPS + 1;
  const positions = new Float32Array(columns * rows * 3);
  const colors = new Float32Array(columns * rows * 3);
  const point = new Vector3();
  const heading = new Vector3();
  const across = new Vector3();
  const seed = side > 0 ? 0 : 50;

  for (let i = 0; i < columns; i += 1) {
    const travel = FROM + ((TO - FROM) * i) / ALONG_STEPS;
    const depth = depthAtTravel(travel);
    pathPoint(depth, point);
    across.crossVectors(pathHeading(depth, heading), UP).normalize().multiplyScalar(side);
    // Narrow in the middle, flaring open at both mouths.
    const pinch = Math.exp(-(((travel - NARROWEST) / 24) ** 2));
    const width = WIDTH_MAX + (WIDTH_MIN - WIDTH_MAX) * pinch;
    const ridge = ABOVE * (0.55 + fbm(travel * 0.12 + seed, 3) * 0.9);

    for (let j = 0; j < rows; j += 1) {
      const up = Math.min(-BELOW + ((ABOVE + BELOW) * j) / UP_STEPS, ridge);
      // Crags, plus horizontal strata; the ridge leans back into the rock.
      const crag = (fbm(travel * 0.18 + seed, up * 0.12) - 0.5) * 9;
      const strata = Math.sin(up * 0.7 + fbm(travel * 0.05, seed) * 6) * 0.8;
      const lean = up > ridge - 4 ? (up - ridge + 4) * 1.4 : 0;
      const out = width + crag + strata + lean;
      const k = (i * rows + j) * 3;
      positions[k] = point.x + across.x * out;
      positions[k + 1] = point.y + up;
      positions[k + 2] = point.z + across.z * out;
      // Lighter near the top, where the light still reaches.
      color.lerpColors(DEEP, TOP, Math.min(Math.max((up + BELOW) / (ABOVE + BELOW), 0), 1) ** 1.6);
      color.multiplyScalar(0.8 + fbm(travel * 0.4, up * 0.4 + seed) * 0.4);
      colors.set([color.r, color.g, color.b], k);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < ALONG_STEPS; i += 1) {
    for (let j = 0; j < UP_STEPS; j += 1) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

/** Depths (m) beyond which the trench is out of sight and not drawn. */
const SHOWN_FROM = depthAtTravel(FROM - 40);
const SHOWN_TO = depthAtTravel(TO + 10);

export const Trench = () => {
  const groupRef = useRef<Group>(null);
  const walls = useMemo(() => [buildWall(1), buildWall(-1)], []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { depth } = sampleFrame(state.clock.elapsedTime, delta);
    group.visible = depth > SHOWN_FROM && depth < SHOWN_TO;
  });

  return (
    <group ref={groupRef}>
      {walls.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          {/* Lambert: the walls fill much of the screen, and matte rock needs no
              physically based shading. Double-sided: one winding serves both. */}
          <meshLambertMaterial vertexColors flatShading side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};
