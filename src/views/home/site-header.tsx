/**
 * @fileoverview The fixed header over the dive — wordmark, section links, the
 * depth gauge and the call to action. A Server Component; only the gauge is a
 * client leaf.
 */

import Link from "next/link";
import type { headerContent } from "@/data/home";
import { DepthGauge } from "@/views/home/depth-gauge";

export interface SiteHeaderProps {
  content: typeof headerContent;
}

const linkClass =
  "transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent focus-visible:text-accent";

export const SiteHeader = ({ content }: SiteHeaderProps) => (
  <header className="pointer-events-none fixed inset-x-0 top-0 z-(--layer-header) flex items-start justify-between bg-linear-to-b from-scrim/50 to-scrim/0 px-12 pt-8 pb-16 text-shadow-legible max-portrait:px-8 max-mobile:px-5 max-mobile:pt-5">
    <Link
      href="#top"
      className={`pointer-events-auto flex items-center gap-3 font-display text-subtitle tracking-wide uppercase ${linkClass}`}
    >
      <span aria-hidden="true" className="size-3 rounded-full bg-accent shadow-glow" />
      {content.name}
    </Link>

    <nav aria-label="Sections" className="pointer-events-auto max-portrait:hidden">
      <ul className="flex gap-10 font-mono text-label uppercase tracking-wide">
        {content.nav.map((item) => (
          <li key={item.href}>
            <a href={item.href} className={linkClass}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>

    <div className="pointer-events-auto flex items-start gap-10">
      <DepthGauge depthLabel={content.depthLabel} signalLabel={content.signalLabel} />
      <a
        href={content.cta.href}
        className="rounded-full border border-foreground/40 px-5 py-2 font-mono text-label uppercase tracking-wide transition-colors duration-[var(--duration-fast)] ease-entrance hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
      >
        {content.cta.label}
      </a>
    </div>
  </header>
);
