"use client";

/**
 * @fileoverview The probe's HUD in the header — depth in metres with a bar
 * filling towards the floor, and the strength of the signal it is chasing.
 * The values come from the dive store on every scroll tick, so they are
 * written straight to the DOM through refs rather than through React state.
 */

import { useEffect, useRef } from "react";
import { MAX_DEPTH, useDive } from "@/views/home/dive-store";

export interface DepthGaugeProps {
  depthLabel: string;
  signalLabel: string;
}

/** Signal strength (%) by depth — the chapter readouts quote these stops. */
const SIGNAL_STOPS: [number, number][] = [
  [0, 12],
  [200, 25],
  [1000, 45],
  [4000, 90],
  [MAX_DEPTH, 100],
];

const signalAt = (depth: number) => {
  let i = 0;
  while (i < SIGNAL_STOPS.length - 2 && depth > SIGNAL_STOPS[i + 1][0]) i += 1;
  const [fromDepth, fromSignal] = SIGNAL_STOPS[i];
  const [toDepth, toSignal] = SIGNAL_STOPS[i + 1];
  const t = Math.min(Math.max((depth - fromDepth) / (toDepth - fromDepth), 0), 1);
  return fromSignal + (toSignal - fromSignal) * t;
};

const formatDepth = (depth: number) => String(Math.round(depth)).padStart(4, "0");
const formatSignal = (depth: number) => String(Math.round(signalAt(depth))).padStart(3, "0");

export const DepthGauge = ({ depthLabel, signalLabel }: DepthGaugeProps) => {
  const depthRef = useRef<HTMLSpanElement>(null);
  const signalRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      useDive.subscribe(({ depth }) => {
        if (depthRef.current) depthRef.current.textContent = formatDepth(depth);
        if (signalRef.current) signalRef.current.textContent = formatSignal(depth);
        if (barRef.current) barRef.current.style.transform = `scaleX(${depth / MAX_DEPTH})`;
      }),
    [],
  );

  return (
    <div className="flex gap-8 font-mono text-meta uppercase tracking-wide max-mobile:hidden">
      <p className="flex flex-col items-end gap-1.5">
        <span className="text-foreground/60">{signalLabel}</span>
        <span className="text-label text-accent tabular-nums">
          <span ref={signalRef}>{formatSignal(0)}</span> %
        </span>
      </p>
      <p className="flex flex-col items-end gap-1.5">
        <span className="text-foreground/60">{depthLabel}</span>
        <span className="text-label text-accent tabular-nums">
          <span ref={depthRef}>{formatDepth(0)}</span> m
        </span>
        <span aria-hidden="true" className="block h-px w-28 bg-foreground/20">
          <span ref={barRef} className="block h-full w-full origin-left scale-x-0 bg-accent" />
        </span>
      </p>
    </div>
  );
};
