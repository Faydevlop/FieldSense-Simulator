import { ConditionLevel, PlantHealthState, SimulationState } from "../types/simulation";

interface GrowthChartCardProps {
  timeline: SimulationState[];
  currentGrowth: number;
  currentHealth: number;
}

interface PlotPoint {
  day: number;
  growth: number;
  health: number;
}

const VITAL_RING_RADIUS = 26;
const VITAL_RING_CIRCUMFERENCE = 2 * Math.PI * VITAL_RING_RADIUS;

function compressTimeline(timeline: SimulationState[], maxPoints = 8): PlotPoint[] {
  if (timeline.length <= maxPoints) {
    return timeline.map(item => ({ day: item.day, growth: item.growth, health: item.health }));
  }

  const output: PlotPoint[] = [];
  const step = (timeline.length - 1) / (maxPoints - 1);

  for (let index = 0; index < maxPoints; index += 1) {
    const timelineIndex = Math.round(index * step);
    const item = timeline[timelineIndex];
    output.push({ day: item.day, growth: item.growth, health: item.health });
  }

  return output;
}

function linePath(values: number[], width: number, height: number, padding: number, maxValue: number): string {
  if (values.length === 0) {
    return "";
  }

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const denominator = Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = padding + (index / denominator) * usableWidth;
      const y = padding + (1 - value / maxValue) * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function labelForHealth(state: PlantHealthState): string {
  if (state === "stressed") {
    return "Stressed";
  }

  if (state === "dead") {
    return "Declined";
  }

  return "Healthy";
}

function labelForLevel(level: ConditionLevel): string {
  return `${level.charAt(0).toUpperCase()}${level.slice(1)}`;
}

function levelIntensity(level: ConditionLevel): number {
  if (level === "high") {
    return 3;
  }

  if (level === "medium") {
    return 2;
  }

  return 1;
}

function ruleSummaryForState(state: SimulationState): string {
  if (state.state === "dead") {
    return "Simulation reached terminal state. Reset and rebalance to restart growth.";
  }

  if (state.water === "low" && state.sunlight === "high") {
    return "Heat stress risk detected. Increase watering or reduce sunlight exposure.";
  }

  if (state.water === "high" && state.sunlight === "low") {
    return "Root rot risk detected. Lower watering and raise sunlight for recovery.";
  }

  if (state.water === "medium" && state.sunlight === "medium") {
    return "Consecutive optimal conditions are supporting strong growth progression.";
  }

  if (state.state === "stressed") {
    return "Recovery mode active. Keep conditions steady to improve plant health.";
  }

  return "Stable progression observed under the selected watering and sunlight balance.";
}

function conditionIcons(kind: "water" | "sunlight", level: ConditionLevel) {
  const activeCount = levelIntensity(level);

  return (
    <span className={`condition-icons ${kind}`} aria-hidden="true">
      {[0, 1, 2].map(index => (
        <span key={`${kind}-${level}-${index}`} className={index < activeCount ? "is-active" : ""} />
      ))}
    </span>
  );
}

export function GrowthChartCard({ timeline, currentGrowth, currentHealth }: GrowthChartCardProps) {
  const points = compressTimeline(timeline);
  const width = 360;
  const height = 210;
  const padding = 20;
  const maxValue = Math.max(100, ...points.map(point => Math.max(point.growth, point.health)));
  const growthLine = linePath(
    points.map(point => point.growth),
    width,
    height,
    padding,
    maxValue,
  );
  const healthLine = linePath(
    points.map(point => point.health),
    width,
    height,
    padding,
    maxValue,
  );
  const stress = Math.max(0, 100 - currentHealth);
  const vitalMetrics = [
    { label: "Health", value: currentHealth, tone: "health" },
    { label: "Growth", value: currentGrowth, tone: "growth" },
    { label: "Stress", value: stress, tone: "stress" },
  ] as const;

  return (
    <aside className="insight-column">
      <section className="sim-card trend-card">
        <h3>Trends</h3>
        <p className="subtle">Growth and health over time</p>
        <div className="trend-plot">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Growth and health trend chart">
            {[0, 25, 50, 75, 100].map(value => {
              const y = padding + (1 - value / 100) * (height - padding * 2);
              return <line key={value} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#dddacb" strokeDasharray="4 4" />;
            })}
            {growthLine ? <path d={growthLine} fill="none" stroke="#4f9a51" strokeWidth={3} strokeLinecap="round" /> : null}
            {healthLine ? <path d={healthLine} fill="none" stroke="#e2b93f" strokeWidth={3} strokeLinecap="round" /> : null}
          </svg>
        </div>
        <div className="legend-row">
          <span className="legend-item">
            <i className="dot growth" />
            Growth
          </span>
          <span className="legend-item">
            <i className="dot health" />
            Health
          </span>
        </div>
      </section>

      <section className="sim-card vitals-card">
        <h3>Vitals</h3>
        <div className="vitals-grid">
          {vitalMetrics.map(metric => {
            const normalizedValue = clampPercent(metric.value);
            const dashOffset = VITAL_RING_CIRCUMFERENCE * (1 - normalizedValue / 100);

            return (
              <article key={metric.label} className={`vital-ring is-${metric.tone}`}>
                <div className="vital-ring__chart" role="img" aria-label={`${metric.label} is ${normalizedValue.toFixed(0)} percent`}>
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle className="vital-ring__track" cx="32" cy="32" r={VITAL_RING_RADIUS} />
                    <circle
                      className="vital-ring__value"
                      cx="32"
                      cy="32"
                      r={VITAL_RING_RADIUS}
                      style={{
                        strokeDasharray: VITAL_RING_CIRCUMFERENCE.toFixed(2),
                        strokeDashoffset: dashOffset.toFixed(2),
                      }}
                    />
                  </svg>
                  <strong>{normalizedValue.toFixed(0)}%</strong>
                </div>
                <p>{metric.label}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="sim-card observation-card">
        <h3>Observation Log</h3>
        <p className="subtle">Chronological record of events and state changes</p>

        <div className="observation-list" role="list" aria-label="Simulation observations by day">
          {timeline.length === 0 ? <p className="subtle">Run the simulation to generate observations.</p> : null}
          {timeline.map((entry, index) => {
            const previousGrowth = timeline[index - 1]?.growth ?? 0;
            const growthDelta = entry.growth - previousGrowth;

            return (
              <article key={`day-${entry.day}-${index}`} className="observation-item" role="listitem">
                <span className={`observation-node is-${entry.state}`} aria-hidden="true" />

                <div className="observation-body">
                  <div className="observation-headline">
                    <h4>Day {entry.day}</h4>

                    <div className="observation-stats">
                      <strong className={`growth-delta ${growthDelta >= 0 ? "is-positive" : "is-negative"}`}>
                        {growthDelta >= 0 ? "+" : ""}
                        {growthDelta.toFixed(1)}%
                      </strong>
                      <span className={`health-pill is-${entry.state}`}>{labelForHealth(entry.state)}</span>
                    </div>
                  </div>

                  <div className="observation-conditions">
                    <span className="condition-chip">
                      {conditionIcons("water", entry.water)}
                      {labelForLevel(entry.water)}
                    </span>
                    <span className="condition-separator">•</span>
                    <span className="condition-chip">
                      {conditionIcons("sunlight", entry.sunlight)}
                      {labelForLevel(entry.sunlight)}
                    </span>
                  </div>

                  <p className="observation-note">{ruleSummaryForState(entry)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

