/**
 * @fileoverview The page's last screen — a giant running line, the crew email,
 * and the footage credits the CC BY licences require. A Server Component; the
 * running line is the <Marquee> client leaf.
 */

import Link from "next/link";
import { Marquee } from "@/components/ui/marquee";
import type { footerContent } from "@/data/home";

/** Milliseconds for the running line to travel two copies. */
const RUNNING_LOOP_MS = 40000;

export interface SiteFooterProps {
  content: typeof footerContent;
}

const linkClass =
  "underline-offset-4 transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent hover:underline focus-visible:text-accent focus-visible:underline";

export const SiteFooter = ({ content }: SiteFooterProps) => (
  <footer id="contact" className="overflow-hidden border-t border-foreground/10 bg-background pt-24 max-mobile:pt-16">
    <Marquee
      items={[content.runningLine]}
      label={content.runningLine}
      duration={RUNNING_LOOP_MS}
      writeIn
      trackClassName="gap-16 pr-16 font-display text-giant whitespace-nowrap"
      separator={<span className="size-6 rounded-full bg-accent shadow-glow max-mobile:size-3" />}
    />

    <div className="px-12 max-portrait:px-8 max-mobile:px-5">
      <a href={`mailto:${content.email}`} className={`mt-16 inline-flex items-center gap-4 font-display text-subtitle ${linkClass}`}>
        {content.cta} <span className="text-accent">→</span>
      </a>

      <div className="mt-24 grid grid-cols-[1fr_2fr] gap-12 border-t border-foreground/15 py-12 max-portrait:grid-cols-1 max-mobile:mt-16">
        <div className="flex flex-col gap-3 text-body text-foreground/75">
          <p>{content.blurb}</p>
          <a href={`mailto:${content.email}`} className={linkClass}>
            {content.email}
          </a>
        </div>
        <div>
          <h2 className="font-mono text-label uppercase tracking-wide text-accent">{content.creditsHeading}</h2>
          <ul className="mt-4 flex flex-col gap-2 text-label text-foreground/70">
            {content.credits.map((credit) => (
              <li key={credit.href}>
                <a href={credit.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {credit.title}
                </a>{" "}
                — {credit.author}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-between gap-6 border-t border-foreground/15 py-8 font-mono text-meta uppercase tracking-wide text-foreground/50 max-mobile:flex-col">
        <span>© 2026 Abyss</span>
        <span className="flex gap-6">
          <Link href="/privacy-policy" className={linkClass}>
            Privacy
          </Link>
          <a href="#top" className={linkClass}>
            {content.backToTop}
          </a>
        </span>
      </div>
    </div>
  </footer>
);
