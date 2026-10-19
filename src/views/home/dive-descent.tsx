"use client";

/**
 * @fileoverview The dive — one pinned stretch of scroll (four viewports per
 * chapter) with the WebGL descent behind and the chapter captions over it.
 *
 * Scroll progress 0-1 is sliced into each chapter's own 0-1, which drives its
 * caption and maps onto that chapter's depth range — so every chapter gets the
 * same scroll whether it spans 200 m or 3000 m. The depth goes to the dive
 * store, which the scene and the header gauge both read. The robot form gets no canvas — a
 * static gradient stands in, and every caption is in the served HTML anyway.
 */

import { useCallback, useRef } from "react";
import { PinnedScene } from "@/components/common/pinned-scene";
import { useRobot } from "@/components/common/robot-view";
import type { ChapterContent } from "@/data/home";
import { ChapterCaption, type ChapterCaptionHandle } from "@/views/home/chapter-caption";
import { DescentCanvas } from "@/views/home/descent/descent-canvas";
import { useDive } from "@/views/home/dive-store";

/** Scroll viewports per chapter. */
const VIEWPORTS_PER_CHAPTER = 4;

export interface DiveDescentProps {
  chapters: ChapterContent[];
  label: string;
}

export const DiveDescent = ({ chapters, label }: DiveDescentProps) => {
  const robot = useRobot();
  const setDepth = useDive((state) => state.setDepth);
  const captionsRef = useRef<(ChapterCaptionHandle | null)[]>([]);

  const handleProgress = useCallback(
    (progress: number) => {
      const position = Math.min(progress * chapters.length, chapters.length - 1e-6);
      const current = chapters[Math.floor(position)];
      const local = position - Math.floor(position);
      setDepth(current.depthFrom + (current.depthTo - current.depthFrom) * local);
      captionsRef.current.forEach((caption, index) =>
        caption?.setProgress(Math.min(Math.max(progress * chapters.length - index, 0), 1)),
      );
    },
    [chapters, setDepth],
  );

  return (
    <PinnedScene
      label={label}
      span={chapters.length * VIEWPORTS_PER_CHAPTER + 1}
      onProgress={handleProgress}
      stageClassName="bg-background"
    >
      {robot ? (
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-accent/30 via-surface to-background" />
      ) : (
        <DescentCanvas />
      )}
      {/* Readability scrim under the copy. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/70 via-scrim/0 to-scrim/25" />
      {chapters.map((chapter, index) => (
        <ChapterCaption
          key={chapter.id}
          ref={(handle) => {
            captionsRef.current[index] = handle;
          }}
          chapter={chapter}
          first={index === 0}
          last={index === chapters.length - 1}
        />
      ))}
    </PinnedScene>
  );
};
