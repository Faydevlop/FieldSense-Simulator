import { ConditionLevel, PlantHealthState } from "../types/simulation";

interface PlantSimulationCardProps {
  currentDay: number;
  statusText: string;
  statusState: PlantHealthState;
  waterLevel: ConditionLevel;
  sunlightLevel: ConditionLevel;
  imageSrc: string;
  health: number;
}

function statusLabel(state: PlantHealthState): string {
  if (state === "healthy") {
    return "Thriving";
  }
  if (state === "stressed") {
    return "Stressed";
  }
  return "Declined";
}

export function PlantSimulationCard({
  currentDay,
  statusText,
  statusState,
  waterLevel,
  sunlightLevel,
  imageSrc,
  health,
}: PlantSimulationCardProps) {
  const conditionLabel = `${waterLevel[0].toUpperCase()}${waterLevel.slice(1)} water / ${sunlightLevel[0].toUpperCase()}${sunlightLevel.slice(1)} sunlight`;

  return (
    <section className="sim-card visual-card">
      <div className="visual-head">
        <div>
          <p className="eyebrow">Plant Detail</p>
          <h2>Day {currentDay}</h2>
        </div>
        <span className={`status-badge is-${statusState}`}>{statusLabel(statusState)}</span>
      </div>

      <div className={`scene sun-${sunlightLevel} water-${waterLevel}`}>
        <div className="sun-orb" />
        <div className="plant-holder">
          <img key={imageSrc} src={imageSrc} className="plant-life-image" alt="Plant life cycle state" />
        </div>
        <div className="soil" />
      </div>

      <p className="status-copy">{statusText}</p>
      <p className="condition-copy">{conditionLabel}</p>

      <div className="health-meter">
        <div className="health-meter__label">
          <span>Health</span>
          <strong>{health.toFixed(0)}%</strong>
        </div>
        <div className="health-meter__track">
          <div className="health-meter__bar" style={{ width: `${health}%` }} />
        </div>
      </div>
    </section>
  );
}
