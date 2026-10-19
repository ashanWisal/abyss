"use client";

/**
 * @fileoverview The field log — one creature per viewport of scroll, shown as
 * a 3D specimen (the same model you met in the dive) beside a plain record of
 * it: name, zone, depth, size and what it did when the probe found it.
 *
 * The numbered index along the bottom shows all of them at once, with the
 * current one filling as you scroll, so it's always clear where you are and
 * how many are left. The robot form gets no canvas; every record is in the
 * served HTML.
 */

import { useCallback, useState } from "react";
import { animated, useSpring } from "@react-spring/web";
import { PinnedScene } from "@/components/common/pinned-scene";
import { useRobot } from "@/components/common/robot-view";
import type { Creature, creaturesContent } from "@/data/home";
import { SpecimenCanvas } from "@/views/home/specimen-canvas";

const pad = (value: number) => String(value).padStart(2, "0");

interface RecordProps {
  creature: Creature;
  index: number;
  labels: (typeof creaturesContent)["labels"];
}

/** One creature's record; remounted per creature, so it rises in fresh. */
const CreatureRecord = ({ creature, index, labels }: RecordProps) => {
  const style = useSpring({ from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 } });
  const rows = [
    [labels.zone, creature.zone],
    [labels.depth, creature.depth],
    [labels.size, creature.size],
  ];

  return (
    <animated.article style={style}>
      <p className="font-mono text-label text-accent tabular-nums">{pad(index + 1)}</p>
      <h3 className="mt-2 font-display text-subtitle">{creature.name}</h3>
      <dl className="mt-6 grid grid-cols-3 gap-6 border-y border-foreground/15 py-4 max-mobile:mt-4 max-mobile:gap-3 max-mobile:py-3">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt className="font-mono text-label uppercase tracking-wide text-foreground/50">{term}</dt>
            <dd className="mt-1 text-body">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-body text-foreground/75 max-mobile:mt-4">{creature.fact}</p>
    </animated.article>
  );
};

export interface FieldLogProps {
  content: typeof creaturesContent;
}

export const FieldLog = ({ content }: FieldLogProps) => {
  const { creatures } = content;
  const robot = useRobot();
  const [current, setCurrent] = useState(0);
  const [{ fill }, fillApi] = useSpring(() => ({ fill: 0 }));

  const handleProgress = useCallback(
    (progress: number) => {
      const position = Math.min(progress * creatures.length, creatures.length - 1e-6);
      setCurrent(Math.floor(position));
      fillApi.start({ fill: position - Math.floor(position) });
    },
    [creatures.length, fillApi],
  );

  return (
    <PinnedScene
      label={content.heading}
      span={creatures.length + 1}
      onProgress={handleProgress}
      stageClassName="bg-background bg-radial-[at_70%_50%] from-surface-raised from-0% to-background to-60%"
    >
      <div id="creatures" className="absolute inset-0">
        {/* The specimen takes the right of the stage (the top on phones). */}
        <div className="absolute top-24 right-0 bottom-36 left-2/5 max-portrait:inset-x-0 max-portrait:top-52 max-portrait:bottom-1/2">
          {!robot && <SpecimenCanvas creatures={creatures} current={current} />}
        </div>

        <div className="absolute top-36 bottom-40 left-12 flex w-2/5 flex-col justify-between max-portrait:top-24 max-portrait:right-8 max-portrait:bottom-28 max-portrait:left-8 max-portrait:w-auto max-mobile:right-5 max-mobile:left-5">
          <header>
            <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
            <h2 className="mt-3 font-display text-title">{content.heading}</h2>
          </header>
          <div aria-hidden="true">
            <CreatureRecord key={current} creature={creatures[current]} index={current} labels={content.labels} />
          </div>
        </div>

        {/* Index of every creature; the current one fills as you scroll. */}
        <ol className="absolute right-12 bottom-14 left-12 grid grid-cols-6 gap-4 font-mono text-label uppercase tracking-wide max-portrait:right-8 max-portrait:left-8 max-mobile:right-5 max-mobile:bottom-10 max-mobile:left-5 max-mobile:gap-2">
          {creatures.map((creature, index) => (
            <li key={creature.name} className={index === current ? "text-foreground" : "text-foreground/40"}>
              <span className="relative block h-px bg-foreground/20">
                {index < current && <span className="absolute inset-0 bg-accent" />}
                {index === current && (
                  <animated.span
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: fill.to((value) => `${value * 100}%`) }}
                  />
                )}
              </span>
              <span className="mt-3 block tabular-nums text-accent">{pad(index + 1)}</span>
              <span className="mt-1 block truncate max-mobile:hidden">{creature.name}</span>
            </li>
          ))}
        </ol>

        {/* Every record for assistive tech; the stage shows one at a time. */}
        <ul className="sr-only">
          {creatures.map((creature) => (
            <li key={creature.name}>
              {creature.name}, {creature.zone}, {creature.depth}, {creature.size}: {creature.fact}
            </li>
          ))}
        </ul>
      </div>
    </PinnedScene>
  );
};
