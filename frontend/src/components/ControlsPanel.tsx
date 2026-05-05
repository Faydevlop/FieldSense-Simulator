import { ConditionLevel, ControlValues } from "../types/simulation";

interface ControlsPanelProps {
  controls: ControlValues;
  disabled?: boolean;
  onLevelChange: (key: keyof ControlValues, value: ConditionLevel) => void;
  onStepOneDay: () => void;
  onRunSevenDays: () => void;
  onResetSimulation: () => void;
}

const levels: ConditionLevel[] = ["low", "medium", "high"];

export function ControlsPanel({
  controls,
  onLevelChange,
  onStepOneDay,
  onRunSevenDays,
  onResetSimulation,
  disabled = false,
}: ControlsPanelProps) {
  return (
    <section className="sim-card control-card">
      <div className="section-head">
        <h2>Environment</h2>
        <span className="pill-tag">Live</span>
      </div>
      <p className="subtle">Tune care levels and run simulation days.</p>

      <div className="level-group">
        <p className="level-group__label">Water Level</p>
        <div className="level-switch" role="radiogroup" aria-label="Water level selection">
          {levels.map(level => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={controls.water === level}
              className={controls.water === level ? "is-active" : ""}
              onClick={() => onLevelChange("water", level)}
              disabled={disabled}
            >
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="level-group">
        <p className="level-group__label">Sunlight Level</p>
        <div className="level-switch" role="radiogroup" aria-label="Sunlight level selection">
          {levels.map(level => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={controls.sunlight === level}
              className={controls.sunlight === level ? "is-active" : ""}
              onClick={() => onLevelChange("sunlight", level)}
              disabled={disabled}
            >
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="control-actions">
        <button className="btn btn-primary" onClick={onStepOneDay} disabled={disabled}>
          Step 1 Day
        </button>
        <button className="btn btn-soft" onClick={onRunSevenDays} disabled={disabled}>
          Run 7 Days
        </button>
        <button className="btn btn-text btn-reset" onClick={onResetSimulation} disabled={disabled}>
          Reset Simulation
        </button>
      </div>

      <div className="care-tip">
        <p className="care-tip__title">Quick tip</p>
        <p className="care-tip__body">Medium water + medium sunlight keeps growth stable across most days.</p>
      </div>
    </section>
  );
}
