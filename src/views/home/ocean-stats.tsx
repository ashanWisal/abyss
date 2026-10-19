/**
 * @fileoverview Four headline numbers on a raised panel. A Server Component;
 * each stat rises in through <Inview>.
 */

import { Inview } from "@/components/animation/springs/in-view";
import type { statsContent } from "@/data/home";

export interface OceanStatsProps {
  content: typeof statsContent;
}

export const OceanStats = ({ content }: OceanStatsProps) => (
  <section id="numbers" aria-labelledby="numbers-heading" className="px-6 pb-32 max-mobile:px-3 max-mobile:pb-20">
    <div className="rounded-3xl bg-surface px-6 py-20 max-mobile:px-2 max-mobile:py-14">
      <div className="px-6 max-portrait:px-2">
        <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
        <h2 id="numbers-heading" className="mt-3 font-display text-title">
          {content.heading}
        </h2>
      </div>
      <dl className="mt-16 grid grid-cols-4 gap-8 px-6 max-portrait:grid-cols-2 max-portrait:gap-y-12 max-mobile:grid-cols-1 max-portrait:px-2">
        {content.stats.map((stat, index) => (
          <Inview
            key={stat.label}
            mode="once"
            from={{ opacity: 0, y: 32 }}
            to={{ opacity: 1, y: 0 }}
            delayIn={index * 100}
            className="flex flex-col border-t border-foreground/20 pt-6"
          >
            <dt className="order-2 mt-3 text-body text-foreground/70">{stat.label}</dt>
            <dd className="font-display text-counter whitespace-nowrap text-accent tabular-nums">{stat.value}</dd>
          </Inview>
        ))}
      </dl>
    </div>
  </section>
);
