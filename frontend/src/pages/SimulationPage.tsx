import { useEffect, useRef, useState } from "react";
import { ControlsPanel } from "../components/ControlsPanel";
import { GrowthChartCard } from "../components/GrowthChartCard";
import { PlantSimulationCard } from "../components/PlantSimulationCard";
import { getSimulation, resetSimulation, runSimulation, startSimulation } from "../api/simulationApi";
import { ConditionLevel, ControlValues, PlantHealthState, PlantType, Simulation, SimulationState } from "../types/simulation";
import { getPlantImage, GROWTH_STAGE_LABELS, resolveGrowthStage } from "../utils/plantAssets";

const defaultPlant: PlantType = {
  id: "plant-1",
  name: "Generic Plant",
  idealWater: "medium",
  idealSunlight: "medium",
  growthRate: 5,
  stressThreshold: 40,
};

function getLiveInsightMessage(controls: ControlValues, healthState: PlantHealthState): string {
  if (healthState === "dead") {
    return "Plant vitality has fully collapsed. Restart with balanced water and light to recover.";
  }

  if (controls.water === "low" && controls.sunlight === "high") {
    return "High sunlight with low water is overheating the plant and draining moisture.";
  }

  if (controls.water === "high" && controls.sunlight === "low") {
    return "High water with low sunlight can saturate roots and slow oxygen flow.";
  }

  if (healthState === "stressed") {
    return "Stress is building. Move toward medium water and medium sunlight for stability.";
  }

  return "Conditions are stable for this stage. Keep care levels steady to maintain healthy growth.";
}

export function SimulationPage() {
  const [controls, setControls] = useState<ControlValues>({
    water: "medium",
    sunlight: "medium",
  });
  const [simulationId, setSimulationId] = useState("");
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [timeline, setTimeline] = useState<SimulationState[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const didStartOnce = useRef(false);

  const currentState = timeline[timeline.length - 1] || null;
  const healthState: PlantHealthState = currentState?.state || "healthy";
  const currentDay = simulation?.currentDay ?? 0;
  const currentHealth = currentState?.health ?? 100;
  const currentGrowth = Math.max(0, Math.min(100, currentState?.growth ?? 0));
  const stage = resolveGrowthStage(currentState);
  const stageLabel = GROWTH_STAGE_LABELS[stage];
  const plantImage = getPlantImage(stage, healthState);
  const liveInsight = getLiveInsightMessage(controls, healthState);

  let statusText = "Plant is thriving under current conditions.";
  if (healthState === "stressed") {
    statusText = "Plant is stressed. Adjust water and sunlight balance.";
  }
  if (healthState === "dead") {
    statusText = "Plant has declined. Reset and try better conditions.";
  }

  function changeLevel(key: keyof ControlValues, value: ConditionLevel): void {
    setControls(previous => ({
      ...previous,
      [key]: value,
    }));
  }

  async function createNewSimulation(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");

    try {
      if (simulationId) {
        await resetSimulation(simulationId);
      }

      const response = await startSimulation({
        plantType: defaultPlant,
        water: controls.water,
        sunlight: controls.sunlight,
      });

      setSimulationId(response.data.simulationId);
      const simulationResponse = await getSimulation(response.data.simulationId);
      setSimulation(simulationResponse.data.simulation);
      setTimeline(simulationResponse.data.timeline);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start simulation");
    } finally {
      setIsBusy(false);
    }
  }

  async function runDays(days: number): Promise<void> {
    if (!simulationId) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      await runSimulation({
        simulationId,
        days,
        water: controls.water,
        sunlight: controls.sunlight,
      });

      const response = await getSimulation(simulationId);
      setSimulation(response.data.simulation);
      setTimeline(response.data.timeline);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to run simulation");
    } finally {
      setIsBusy(false);
    }
  }

  async function resetCurrentSimulation(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");

    try {
      if (simulationId) {
        await resetSimulation(simulationId);
      }

      const response = await startSimulation({
        plantType: defaultPlant,
        water: controls.water,
        sunlight: controls.sunlight,
      });

      setSimulationId(response.data.simulationId);

      const simulationResponse = await getSimulation(response.data.simulationId);
      setSimulation(simulationResponse.data.simulation);
      setTimeline(simulationResponse.data.timeline);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reset simulation");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (didStartOnce.current) {
      return;
    }

    didStartOnce.current = true;
    void createNewSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sim-shell app-frame">
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="sim-grid">
        <ControlsPanel
          controls={controls}
          disabled={isBusy}
          onLevelChange={changeLevel}
          onStepOneDay={() => void runDays(1)}
          onRunSevenDays={() => void runDays(7)}
          onResetSimulation={() => void resetCurrentSimulation()}
        />

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

        <GrowthChartCard timeline={timeline} currentGrowth={currentGrowth} currentHealth={currentHealth} />
      </div>
    </div>
  );
}
