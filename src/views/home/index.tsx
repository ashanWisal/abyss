/**
 * Home view — a Server Component.
 *
 * The dive (one pinned WebGL descent, captioned in four chapters) runs from
 * the surface to the floor while the header's gauge counts the depth; then the
 * field log (3D specimens of what you met), the water column, the numbers, and
 * the footer. Sections are
 * client leaves where they need to be, so this view stays a Server Component.
 */
import {
  chapters,
  diveLabel,
  creaturesContent,
  footerContent,
  headerContent,
  statsContent,
  zonesContent,
} from "@/data/home";
import { HydrateWhenIdle } from "@/components/common/hydrate-when-idle";
import { RobotProvider, RobotView } from "@/components/common/robot-view";
import { FieldLog } from "@/views/home/field-log";
import { DepthZones } from "@/views/home/depth-zones";
import { DiveDescent } from "@/views/home/dive-descent";
import { OceanStats } from "@/views/home/ocean-stats";
import { SiteFooter } from "@/views/home/site-footer";
import { SiteHeader } from "@/views/home/site-header";

export interface HomeViewProps {
  /**
   * The robot form (D-016, `app/robot-view`): every entrance at rest in the
   * served HTML, and a static gradient in place of the WebGL scene.
   */
  robot?: boolean;
}

export const HomeView = ({ robot = false }: HomeViewProps) => (
  <RobotProvider robot={robot}>
    {robot && <RobotView />}
    <SiteHeader content={headerContent} />
    <main id="top" className="isolate">
      <DiveDescent chapters={chapters} label={diveLabel} />
      <FieldLog content={creaturesContent} />
      <DepthZones content={zonesContent} />
      <OceanStats content={statsContent} />
    </main>
    {/* The page's last screen: hydrated in an idle period after load. */}
    <HydrateWhenIdle>
      <SiteFooter content={footerContent} />
    </HydrateWhenIdle>
  </RobotProvider>
);
