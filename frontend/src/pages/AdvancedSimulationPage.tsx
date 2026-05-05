import { useEffect, useMemo, useState } from "react";
import {
  compareAdvancedSimulations,
  exportAdvancedSimulation,
  getAdvancedSimulation,
  listAdvancedSimulations,
  resetAdvancedSimulation,
  runAdvancedSimulation,
  startAdvancedSimulation,
} from "../api/advancedSimulationApi";
import { AdvancedControls, AdvancedSimulationState } from "../types/advancedSimulation";
import { ConditionLevel, PlantType, SimulationState } from "../types/simulation";
import { GrowthChartCard } from "../components/GrowthChartCard";
import { PlantSimulationCard } from "../components/PlantSimulationCard";
import { getPlantImage, GROWTH_STAGE_LABELS, resolveGrowthStage } from "../utils/plantAssets";

const LEVELS: ConditionLevel[] = ["low", "medium", "high"];
const SOIL_TYPES = ["loamy", "clay", "sandy"] as const;

const defaultPlant: PlantType = {
  id: "plant-1",
  name: "Generic Plant",
  idealWater: "medium",
  idealSunlight: "medium",
  growthRate: 5,
  stressThreshold: 40,
};

const defaultControls: AdvancedControls = {
  water: "medium",
  sunlight: "medium",
  soilMoisture: "medium",
  humidity: "medium",
  temperature: "medium",
  fertilizerLevel: "medium",
  soilType: "loamy",
};

const PRIMARY_LEVEL_FIELDS: Array<{ key: "water" | "sunlight"; label: string }> = [
  { key: "water", label: "Water Level" },
  { key: "sunlight", label: "Sunlight Level" },
];

const ADVANCED_LEVEL_FIELDS: Array<{
  key: "soilMoisture" | "humidity" | "temperature" | "fertilizerLevel";
  label: string;
}> = [
  { key: "soilMoisture", label: "Soil Moisture" },
  { key: "humidity", label: "Humidity" },
  { key: "temperature", label: "Temperature" },
  { key: "fertilizerLevel", label: "Fertilizer" },
];

interface SavedScenarioItem {
  simulation: {
    id: string;
    name: string;
    currentDay: number;
    status: string;
  };
  latestState: AdvancedSimulationState | null;
}

interface ComparisonScenario {
  id: string;
  name: string;
  timeline: AdvancedSimulationState[];
}

function toSimpleTimeline(timeline: AdvancedSimulationState[]): SimulationState[] {
  return timeline.map(item => ({
    day: item.day,
    water: item.controls.water,
    sunlight: item.controls.sunlight,
    growth: item.growth,
    health: item.health,
    state: item.state,
  }));
}

function getAdvancedLiveInsight(controls: AdvancedControls, latestState: AdvancedSimulationState | null): string {
  if (latestState?.state === "dead") {
    return "Plant has reached a terminal state under this scenario. Rebalance moisture, temperature, and light to retry.";
  }

  const primaryRuleNote = latestState?.appliedRuleNotes?.[0];
  if (primaryRuleNote) {
    return primaryRuleNote;
  }

  if (controls.temperature === "high" && controls.humidity === "low") {
    return "Hot and dry air is increasing transpiration, so the plant is losing moisture faster.";
  }

  if (controls.water === "low" && controls.sunlight === "high") {
    return "High sunlight with low water is overheating the plant and draining stored moisture.";
  }

  if (latestState?.state === "stressed") {
    return "Stress is rising from combined environmental pressure. Move controls closer to medium to stabilize.";
  }

  return "Current environment is supporting steady growth for this stage.";
}

export function AdvancedSimulationPage() {
  const [controls, setControls] = useState<AdvancedControls>(defaultControls);
  const [scenarioName, setScenarioName] = useState("");
  const [uncertaintyEnabled, setUncertaintyEnabled] = useState(false);
  const [uncertaintyIntensity, setUncertaintyIntensity] = useState(0.15);
  const [seedInput, setSeedInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeSimulationId, setActiveSimulationId] = useState("");
  const [activeTimeline, setActiveTimeline] = useState<AdvancedSimulationState[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioItem[]>([]);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [comparisonScenarios, setComparisonScenarios] = useState<ComparisonScenario[]>([]);

  const simpleTimeline = useMemo(() => toSimpleTimeline(activeTimeline), [activeTimeline]);
  const latestState = activeTimeline[activeTimeline.length - 1] || null;
  const healthState = latestState?.state || "healthy";
  const stage = resolveGrowthStage(simpleTimeline[simpleTimeline.length - 1] || null);
  const stageLabel = GROWTH_STAGE_LABELS[stage];
  const plantImage = getPlantImage(stage, healthState);
  const currentHealth = latestState?.health ?? 100;
  const currentGrowth = latestState?.growth ?? 0;
  const currentDay = latestState?.day ?? 0;
  const liveInsight = getAdvancedLiveInsight(controls, latestState);

  async function refreshSavedScenarios(): Promise<void> {
    const response = await listAdvancedSimulations();
    setSavedScenarios(response.data.simulations);
  }

  async function createScenario(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");

    try {
      const response = await startAdvancedSimulation({
        plantType: defaultPlant,
        controls,
        scenarioName: scenarioName.trim() || undefined,
        uncertaintyMode: {
          enabled: uncertaintyEnabled,
          intensity: uncertaintyIntensity,
          seed: seedInput.trim() ? Number(seedInput) : undefined,
        },
      });

      const simulationId = response.data.simulationId;
      const details = await getAdvancedSimulation(simulationId);
      setActiveSimulationId(simulationId);
      setActiveTimeline(details.data.timeline);
      await refreshSavedScenarios();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create advanced scenario");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadScenario(simulationId: string): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const response = await getAdvancedSimulation(simulationId);
      setActiveSimulationId(simulationId);
      setActiveTimeline(response.data.timeline);
      const latest = response.data.timeline[response.data.timeline.length - 1];
      if (latest) {
        setControls(latest.controls);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load scenario");
    } finally {
      setIsBusy(false);
    }
  }

  async function runDays(days: number): Promise<void> {
    if (!activeSimulationId) {
      setErrorMessage("Create or load a scenario first.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    try {
      await runAdvancedSimulation({
        simulationId: activeSimulationId,
        days,
        controls,
        uncertaintyMode: {
          enabled: uncertaintyEnabled,
          intensity: uncertaintyIntensity,
          seed: seedInput.trim() ? Number(seedInput) : undefined,
        },
      });

      const response = await getAdvancedSimulation(activeSimulationId);
      setActiveTimeline(response.data.timeline);
      await refreshSavedScenarios();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to run advanced simulation");
    } finally {
      setIsBusy(false);
    }
  }

  async function resetActiveScenario(): Promise<void> {
    if (!activeSimulationId) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    try {
      await resetAdvancedSimulation(activeSimulationId);
      setActiveSimulationId("");
      setActiveTimeline([]);
      setComparisonScenarios([]);
      setSelectedComparisonIds(ids => ids.filter(id => id !== activeSimulationId));
      await refreshSavedScenarios();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reset scenario");
    } finally {
      setIsBusy(false);
    }
  }

  async function runComparison(): Promise<void> {
    if (selectedComparisonIds.length < 2) {
      setComparisonScenarios([]);
      return;
    }

    try {
      const response = await compareAdvancedSimulations(selectedComparisonIds);
      const scenarios = response.data.comparison.map(item => ({
        id: item.simulation.id,
        name: item.simulation.name,
        timeline: item.timeline,
      }));
      setComparisonScenarios(scenarios);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to compare scenarios");
    }
  }

  async function exportScenario(simulationId: string): Promise<void> {
    try {
      const fileBlob = await exportAdvancedSimulation(simulationId);
      const objectUrl = URL.createObjectURL(fileBlob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${simulationId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to export scenario");
    }
  }

  useEffect(() => {
    void refreshSavedScenarios();
  }, []);

  useEffect(() => {
    void runComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComparisonIds]);

  function setLevel<K extends keyof AdvancedControls>(key: K, value: AdvancedControls[K]): void {
    setControls(previous => ({
      ...previous,
      [key]: value,
    }));
  }

  const statusText = healthState === "dead"
    ? "Scenario reached a terminal plant state."
    : healthState === "stressed"
      ? "Plant stress is rising. Tune advanced controls."
      : "Plant is stable under current advanced controls.";
  const comparisonDays = useMemo(() => {
    const daySet = new Set<number>();
    comparisonScenarios.forEach(scenario => {
      scenario.timeline.forEach(point => daySet.add(point.day));
    });
    return [...daySet].sort((a, b) => a - b);
  }, [comparisonScenarios]);

  return (
    <div className="sim-shell app-frame advanced-frame">
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="sim-grid">
        <section className="sim-card control-card advanced-control-card">
          <div className="section-head">
            <h2>Advanced Environment</h2>
            <span className="pill-tag">Lab</span>
          </div>
          <p className="subtle">Use base care plus extra environment settings, then run days like the main simulator.</p>

          <label className="advanced-field">
            <span>Scenario Name</span>
            <input
              className="advanced-input"
              placeholder="e.g. High Heat Recovery"
              value={scenarioName}
              onChange={event => setScenarioName(event.target.value)}
            />
          </label>

          {PRIMARY_LEVEL_FIELDS.map(({ key, label }) => (
            <div className="level-group" key={key}>
              <p className="level-group__label">{label}</p>
              <div className="level-switch" role="radiogroup" aria-label={`${label} selection`}>
                {LEVELS.map(level => (
                  <button
                    key={`${key}-${level}`}
                    type="button"
                    role="radio"
                    aria-checked={controls[key] === level}
                    className={controls[key] === level ? "is-active" : ""}
                    onClick={() => setLevel(key, level)}
                    disabled={isBusy}
                  >
                    {level[0].toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="advanced-divider" />

          <div className="advanced-levels">
            {ADVANCED_LEVEL_FIELDS.map(({ key, label }) => (
              <div className="level-group" key={key}>
                <p className="level-group__label">{label}</p>
                <div className="level-switch" role="radiogroup" aria-label={`${label} selection`}>
                  {LEVELS.map(level => (
                    <button
                      key={`${key}-${level}`}
                      type="button"
                      role="radio"
                      aria-checked={controls[key] === level}
                      className={controls[key] === level ? "is-active" : ""}
                      onClick={() => setLevel(key, level)}
                      disabled={isBusy}
                    >
                      {level[0].toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="level-group">
              <p className="level-group__label">Soil Type</p>
              <div className="level-switch" role="radiogroup" aria-label="Soil type selection">
                {SOIL_TYPES.map(type => (
                  <button
                    key={`soil-${type}`}
                    type="button"
                    role="radio"
                    aria-checked={(controls.soilType || "loamy") === type}
                    className={(controls.soilType || "loamy") === type ? "is-active" : ""}
                    onClick={() => setLevel("soilType", type)}
                    disabled={isBusy}
                  >
                    {type[0].toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="advanced-uncertainty">
            <label className="advanced-toggle">
              <input type="checkbox" checked={uncertaintyEnabled} onChange={event => setUncertaintyEnabled(event.target.checked)} />
              Enable uncertainty mode
            </label>

            {uncertaintyEnabled ? (
              <div className="advanced-uncertainty-grid">
                <label className="advanced-field">
                  <span>Uncertainty Intensity ({uncertaintyIntensity.toFixed(2)})</span>
                  <input type="range" min={0} max={0.6} step={0.01} value={uncertaintyIntensity} onChange={event => setUncertaintyIntensity(Number(event.target.value))} />
                </label>
                <label className="advanced-field">
                  <span>Optional Seed</span>
                  <input className="advanced-input" placeholder="12345" value={seedInput} onChange={event => setSeedInput(event.target.value)} />
                </label>
              </div>
            ) : null}
          </div>

          <div className="control-actions advanced-actions">
            <button className="btn btn-primary" onClick={() => void createScenario()} disabled={isBusy}>
              Start Scenario
            </button>
            <button className="btn btn-soft" onClick={() => void runDays(1)} disabled={isBusy || !activeSimulationId}>
              Step 1 Day
            </button>
            <button className="btn btn-soft" onClick={() => void runDays(7)} disabled={isBusy || !activeSimulationId}>
              Run 7 Days
            </button>
            <button className="btn btn-text btn-reset" onClick={() => void resetActiveScenario()} disabled={isBusy || !activeSimulationId}>
              Reset Active
            </button>
          </div>

          <div className="care-tip">
            <p className="care-tip__title">Lab tip</p>
            <p className="care-tip__body">Start a fresh scenario after major control changes, then compare it with previous runs.</p>
          </div>
        </section>

        <PlantSimulationCard
          currentDay={currentDay}
          statusText={statusText}
          statusState={healthState}
          waterLevel={controls.water}
          sunlightLevel={controls.sunlight}
          imageSrc={plantImage}
          health={currentHealth}
          stageLabel={stageLabel}
          liveInsight={liveInsight}
        />
        <GrowthChartCard timeline={simpleTimeline} currentGrowth={currentGrowth} currentHealth={currentHealth} />
      </div>

      <div className={`advanced-lab-grid ${comparisonScenarios.length > 0 ? "has-comparison" : ""}`}>
        <section className="sim-card scenario-lab-card">
          <div className="section-head">
            <h3>Scenario Lab</h3>
            <span className="subtle">{savedScenarios.length} saved</span>
          </div>
          <div className="scenario-list">
            {savedScenarios.map(item => {
              const isSelected = selectedComparisonIds.includes(item.simulation.id);
              return (
                <article key={item.simulation.id} className={`scenario-item ${activeSimulationId === item.simulation.id ? "is-active" : ""}`}>
                  <div>
                    <strong>{item.simulation.name}</strong>
                    <p className="subtle">
                      Day {item.simulation.currentDay} - {item.latestState?.state || item.simulation.status}
                    </p>
                  </div>
                  <div className="scenario-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={event => {
                          setSelectedComparisonIds(current =>
                            event.target.checked ? [...new Set([...current, item.simulation.id])] : current.filter(id => id !== item.simulation.id),
                          );
                        }}
                      />
                      Compare
                    </label>
                    <button type="button" className="btn btn-soft" onClick={() => void loadScenario(item.simulation.id)}>
                      Load
                    </button>
                    <button type="button" className="btn btn-soft" onClick={() => void exportScenario(item.simulation.id)}>
                      Export CSV
                    </button>
                  </div>
                </article>
              );
            })}
            {savedScenarios.length === 0 ? <p className="subtle">No scenarios saved yet. Start one above.</p> : null}
          </div>
        </section>

        {comparisonScenarios.length > 0 ? (
          <section className="sim-card comparison-card">
            <h3>Comparison</h3>
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    {comparisonScenarios.map(scenario => (
                      <th key={`head-${scenario.id}`}>{scenario.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonDays.map(day => (
                    <tr key={`day-${day}`}>
                      <td>Day {day}</td>
                      {comparisonScenarios.map(scenario => {
                        const point = scenario.timeline.find(entry => entry.day === day);
                        return (
                          <td key={`${scenario.id}-${day}`}>
                            {point ? `${point.state} | H ${point.health.toFixed(1)}% | G ${point.growth.toFixed(1)}% | S ${point.stress.toFixed(1)}%` : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
