/**
 * @fileoverview The water column as a numbered list — one row per zone, each
 * rising into place as it scrolls in. A Server Component; the reveal is the
 * <Inview> client leaf.
 */

import { Inview } from "@/components/animation/springs/in-view";
import type { zonesContent } from "@/data/home";

export interface DepthZonesProps {
  content: typeof zonesContent;
}

export const DepthZones = ({ content }: DepthZonesProps) => (
  <section id="zones" aria-labelledby="zones-heading" className="bg-background px-12 py-32 max-portrait:px-8 max-mobile:px-5 max-mobile:py-20">
    <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
    <h2 id="zones-heading" className="mt-3 font-display text-title">
      {content.heading}
    </h2>

    <ol className="mt-16 border-t border-foreground/15">
      {content.zones.map((zone, index) => (
        <Inview
          key={zone.name}
          tag="li"
          mode="once"
          from={{ opacity: 0, y: 24 }}
          to={{ opacity: 1, y: 0 }}
          delayIn={index * 80}
          className="group grid grid-cols-[4rem_1fr_14rem_1.5fr] items-baseline gap-8 border-b border-foreground/15 py-8 max-portrait:grid-cols-[3rem_1fr] max-portrait:gap-x-6 max-portrait:gap-y-2"
        >
          <span className="font-mono text-label text-foreground/50">{String(index + 1).padStart(2, "0")}</span>
          <span className="font-display text-subtitle transition-colors duration-[var(--duration-fast)] ease-entrance group-hover:text-accent">
            {zone.name}
            <span className="ml-3 align-middle font-mono text-meta uppercase tracking-wide text-foreground/50">{zone.scientificName}</span>
          </span>
          <span className="font-mono text-label text-accent tabular-nums max-portrait:col-start-2">{zone.range}</span>
          <span className="text-body text-foreground/75 max-portrait:col-start-2">{zone.fact}</span>
        </Inview>
      ))}
    </ol>
  </section>
);
