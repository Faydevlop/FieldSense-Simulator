import { GrowthStage } from "../types/simulation";
import { GROWTH_STAGE_LABELS } from "../utils/plantAssets";

interface GrowthStageTimelineProps {
  activeStage: GrowthStage;
}

const STAGES: GrowthStage[] = ["seed", "sprout", "growing", "mature", "decline"];
const STAGE_ICONS: Record<GrowthStage, string> = {
  seed: "🫘",
  sprout: "🌱",
  growing: "🌿",
  mature: "🌾",
  decline: "🥀",
};

export function GrowthStageTimeline({ activeStage }: GrowthStageTimelineProps) {
  const activeIndex = STAGES.indexOf(activeStage);
  const progress = activeIndex <= 0 ? 0 : (activeIndex / (STAGES.length - 1)) * 100;

  return (
    <section className="panel stage-panel">
      <h2>Growth Stage</h2>

      <div className="stage-track">
        <div className="stage-track__base" />
        <div className="stage-track__active" style={{ width: `${progress}%` }} />

        {STAGES.map((stage, index) => {
          const isActive = index === activeIndex;
          const isPassed = index < activeIndex;

          return (
            <div key={stage} className={`stage-node ${isActive ? "is-active" : ""} ${isPassed ? "is-passed" : ""}`}>
              <div className="stage-node__icon">{STAGE_ICONS[stage]}</div>
              <span>{GROWTH_STAGE_LABELS[stage]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
