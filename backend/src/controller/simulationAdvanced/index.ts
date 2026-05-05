import { Request, Response } from "express";
import { simulateEngineDays, simulateEngineNextState } from "../../services/simulationEngine";
import { advancedSimulationStore } from "../../utils/v1/advancedSimulationStore";
import { AdvancedControls, AdvancedSimulation, SoilType } from "../../utils/v1/advancedTypes";
import { ConditionLevel, PlantType } from "../../utils/v1/types";

const CONDITION_LEVELS = ["low", "medium", "high"];
const SOIL_TYPES: SoilType[] = ["loamy", "clay", "sandy"];

function isConditionLevel(value: unknown): value is ConditionLevel {
  return typeof value === "string" && CONDITION_LEVELS.includes(value.toLowerCase());
}

function normalizeLevel(value: unknown): ConditionLevel | "" {
  return typeof value === "string" ? (value.trim().toLowerCase() as ConditionLevel) : "";
}

function normalizeSoilType(value: unknown): SoilType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const soilType = value.trim().toLowerCase() as SoilType;
  return SOIL_TYPES.includes(soilType) ? soilType : undefined;
}

function normalizeControls(payload: unknown): AdvancedControls | null {
  const controls = payload as Partial<AdvancedControls> | null | undefined;
  if (!controls) {
    return null;
  }

  const water = normalizeLevel(controls.water);
  const sunlight = normalizeLevel(controls.sunlight);
  const soilMoisture = normalizeLevel(controls.soilMoisture);
  const humidity = normalizeLevel(controls.humidity);
  const temperature = normalizeLevel(controls.temperature);
  const fertilizerLevel = normalizeLevel(controls.fertilizerLevel);
  const soilType = normalizeSoilType(controls.soilType);

  if (
    !isConditionLevel(water) ||
    !isConditionLevel(sunlight) ||
    !isConditionLevel(soilMoisture) ||
    !isConditionLevel(humidity) ||
    !isConditionLevel(temperature) ||
    !isConditionLevel(fertilizerLevel)
  ) {
    return null;
  }

  return {
    water,
    sunlight,
    soilMoisture,
    humidity,
    temperature,
    fertilizerLevel,
    soilType,
  };
}

function normalizePartialControls(payload: unknown): Partial<AdvancedControls> | null {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const controls = payload as Partial<AdvancedControls>;
  const normalized: Partial<AdvancedControls> = {};

  if (controls.water !== undefined) {
    const water = normalizeLevel(controls.water);
    if (!isConditionLevel(water)) {
      return null;
    }
    normalized.water = water;
  }

  if (controls.sunlight !== undefined) {
    const sunlight = normalizeLevel(controls.sunlight);
    if (!isConditionLevel(sunlight)) {
      return null;
    }
    normalized.sunlight = sunlight;
  }

  if (controls.soilMoisture !== undefined) {
    const soilMoisture = normalizeLevel(controls.soilMoisture);
    if (!isConditionLevel(soilMoisture)) {
      return null;
    }
    normalized.soilMoisture = soilMoisture;
  }

  if (controls.humidity !== undefined) {
    const humidity = normalizeLevel(controls.humidity);
    if (!isConditionLevel(humidity)) {
      return null;
    }
    normalized.humidity = humidity;
  }

  if (controls.temperature !== undefined) {
    const temperature = normalizeLevel(controls.temperature);
    if (!isConditionLevel(temperature)) {
      return null;
    }
    normalized.temperature = temperature;
  }

  if (controls.fertilizerLevel !== undefined) {
    const fertilizerLevel = normalizeLevel(controls.fertilizerLevel);
    if (!isConditionLevel(fertilizerLevel)) {
      return null;
    }
    normalized.fertilizerLevel = fertilizerLevel;
  }

  if (controls.soilType !== undefined) {
    const soilType = normalizeSoilType(controls.soilType);
    if (!soilType) {
      return null;
    }
    normalized.soilType = soilType;
  }

  return normalized;
}

function normalizeUncertaintyMode(payload: unknown): { enabled: boolean; intensity: number; seed?: number } {
  if (!payload || typeof payload !== "object") {
    return { enabled: false, intensity: 0.15 };
  }

  const mode = payload as { enabled?: unknown; intensity?: unknown; seed?: unknown };
  const enabled = mode.enabled === true;
  const rawIntensity = typeof mode.intensity === "number" ? mode.intensity : 0.15;
  const intensity = Math.max(0, Math.min(0.6, rawIntensity));
  const seed = typeof mode.seed === "number" && Number.isFinite(mode.seed) ? Math.abs(Math.floor(mode.seed)) : undefined;
  return { enabled, intensity, seed };
}

function cleanPlantType(plantType: unknown): PlantType | null {
  const raw = plantType as Partial<PlantType> | null | undefined;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  if (!raw.id || !raw.name) {
    return null;
  }

  if (!CONDITION_LEVELS.includes(String(raw.idealWater)) || !CONDITION_LEVELS.includes(String(raw.idealSunlight))) {
    return null;
  }

  if (typeof raw.growthRate !== "number" || raw.growthRate <= 0) {
    return null;
  }

  if (typeof raw.stressThreshold !== "number" || raw.stressThreshold < 1 || raw.stressThreshold > 100) {
    return null;
  }

  return {
    id: String(raw.id),
    name: String(raw.name),
    idealWater: raw.idealWater as ConditionLevel,
    idealSunlight: raw.idealSunlight as ConditionLevel,
    growthRate: raw.growthRate,
    stressThreshold: raw.stressThreshold,
  };
}

function csvFromTimeline(simulationId: string, timeline: ReturnType<typeof getTimelineForCsv>): string {
  const headers = [
    "simulationId",
    "day",
    "state",
    "health",
    "growth",
    "stress",
    "water",
    "sunlight",
    "soilMoisture",
    "humidity",
    "temperature",
    "fertilizerLevel",
    "soilType",
    "appliedRuleIds",
  ];

  const rows = timeline.map(item => [
    simulationId,
    String(item.day),
    item.state,
    String(item.health),
    String(item.growth),
    String(item.stress),
    item.controls.water,
    item.controls.sunlight,
    item.controls.soilMoisture,
    item.controls.humidity,
    item.controls.temperature,
    item.controls.fertilizerLevel,
    item.controls.soilType || "",
    item.appliedRuleIds.join("|"),
  ]);

  return [headers.join(","), ...rows.map(row => row.map(value => `"${value.replace(/"/g, "\"\"")}"`).join(","))].join("\n");
}

function getTimelineForCsv(value: unknown) {
  return (value || []) as Array<{
    day: number;
    state: string;
    health: number;
    growth: number;
    stress: number;
    controls: {
      water: string;
      sunlight: string;
      soilMoisture: string;
      humidity: string;
      temperature: string;
      fertilizerLevel: string;
      soilType?: string;
    };
    appliedRuleIds: string[];
  }>;
}

export async function startAdvancedSimulation(req: Request, res: Response): Promise<void> {
  try {
    const { plantType, controls, scenarioName, uncertaintyMode } = req.body || {};
    const cleanType = cleanPlantType(plantType);
    const cleanControls = normalizeControls(controls);
    const uncertainty = normalizeUncertaintyMode(uncertaintyMode);

    if (!cleanType) {
      res.status(400).json({
        status: 400,
        message: "Invalid plantType payload",
        data: {},
        toastMessage: "Invalid plantType",
      });
      return;
    }

    if (!cleanControls) {
      res.status(400).json({
        status: 400,
        message: "Invalid controls payload",
        data: {},
        toastMessage: "Invalid controls",
      });
      return;
    }

    const simulationId = `adv-sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const initialRandomState = uncertainty.seed ?? Math.floor(Math.random() * 4294967295);
    const firstStateResult = simulateEngineNextState({
      isAdvanced: true,
      day: 1,
      plantType: cleanType,
      controls: cleanControls,
      previousState: null,
      uncertaintyEnabled: uncertainty.enabled,
      uncertaintyIntensity: uncertainty.intensity,
      randomState: initialRandomState,
    });

    const simulation: AdvancedSimulation = {
      id: simulationId,
      name: typeof scenarioName === "string" && scenarioName.trim() ? scenarioName.trim() : `Scenario ${new Date().toLocaleString()}`,
      plantType: cleanType,
      currentDay: 1,
      status: firstStateResult.nextState.state === "dead" ? "completed" : "running",
      uncertaintyMode: {
        enabled: uncertainty.enabled,
        intensity: uncertainty.intensity,
      },
      randomState: firstStateResult.randomState,
      createdAt: new Date().toISOString(),
    };

    advancedSimulationStore.simulations[simulationId] = simulation;
    advancedSimulationStore.states[simulationId] = [firstStateResult.nextState];

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulationId,
        simulation,
        latestState: firstStateResult.nextState,
      },
      toastMessage: "Advanced simulation started successfully",
    });
  } catch (error) {
    console.error("[advanced-simulation] start failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to start advanced simulation",
    });
  }
}

export async function runAdvancedSimulation(req: Request, res: Response): Promise<void> {
  try {
    const { simulationId, days, controls, uncertaintyMode } = req.body || {};
    if (!simulationId || typeof simulationId !== "string") {
      res.status(400).json({
        status: 400,
        message: "simulationId is required",
        data: {},
        toastMessage: "Invalid simulationId",
      });
      return;
    }

    if (!Number.isInteger(days) || days <= 0) {
      res.status(400).json({
        status: 400,
        message: "days must be a positive integer",
        data: {},
        toastMessage: "Invalid days",
      });
      return;
    }

    const simulation = advancedSimulationStore.simulations[simulationId];
    if (!simulation) {
      res.status(404).json({
        status: 404,
        message: "Simulation not found",
        data: {},
        toastMessage: "Simulation not found",
      });
      return;
    }

    const controlsOverride = normalizePartialControls(controls);
    if (controlsOverride === null) {
      res.status(400).json({
        status: 400,
        message: "Invalid controls payload",
        data: {},
        toastMessage: "Invalid controls",
      });
      return;
    }

    const normalizedUncertainty = normalizeUncertaintyMode(uncertaintyMode);
    const timeline = advancedSimulationStore.states[simulationId] || [];
    const result = simulateEngineDays({
      isAdvanced: true,
      plantType: simulation.plantType,
      timeline,
      days,
      currentDay: simulation.currentDay,
      status: simulation.status,
      controlsOverride,
      uncertaintyEnabled: normalizedUncertainty.enabled,
      uncertaintyIntensity: normalizedUncertainty.intensity,
      randomState: simulation.randomState,
    });

    simulation.currentDay = result.currentDay;
    simulation.status = result.status;
    simulation.randomState = result.randomState;
    simulation.uncertaintyMode = {
      enabled: normalizedUncertainty.enabled,
      intensity: normalizedUncertainty.intensity,
    };

    advancedSimulationStore.simulations[simulationId] = simulation;
    advancedSimulationStore.states[simulationId] = result.timeline;

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulationId,
        currentDay: result.currentDay,
        status: result.status,
        daysSimulated: result.daysSimulated,
        latestState: result.latestState,
      },
      toastMessage: "Advanced simulation ran successfully",
    });
  } catch (error) {
    console.error("[advanced-simulation] run failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to run advanced simulation",
    });
  }
}

export async function getAdvancedSimulation(req: Request, res: Response): Promise<void> {
  try {
    const simulationId = String(req.params.id || "");
    const simulation = advancedSimulationStore.simulations[simulationId];
    if (!simulation) {
      res.status(404).json({
        status: 404,
        message: "Simulation not found",
        data: {},
        toastMessage: "Simulation not found",
      });
      return;
    }

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulation,
        timeline: advancedSimulationStore.states[simulationId] || [],
      },
      toastMessage: "Advanced simulation fetched successfully",
    });
  } catch (error) {
    console.error("[advanced-simulation] fetch failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to fetch advanced simulation",
    });
  }
}

export async function resetAdvancedSimulation(req: Request, res: Response): Promise<void> {
  try {
    const { simulationId } = req.body || {};
    if (!simulationId || typeof simulationId !== "string") {
      res.status(400).json({
        status: 400,
        message: "simulationId is required",
        data: {},
        toastMessage: "Invalid simulationId",
      });
      return;
    }

    if (!advancedSimulationStore.simulations[simulationId]) {
      res.status(404).json({
        status: 404,
        message: "Simulation not found",
        data: {},
        toastMessage: "Simulation not found",
      });
      return;
    }

    delete advancedSimulationStore.simulations[simulationId];
    delete advancedSimulationStore.states[simulationId];

    res.status(200).json({
      status: 200,
      message: "success",
      data: { simulationId },
      toastMessage: "Advanced simulation reset successfully",
    });
  } catch (error) {
    console.error("[advanced-simulation] reset failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to reset advanced simulation",
    });
  }
}

export async function listAdvancedSimulations(_req: Request, res: Response): Promise<void> {
  try {
    const simulations = Object.values(advancedSimulationStore.simulations).map(simulation => {
      const timeline = advancedSimulationStore.states[simulation.id] || [];
      return {
        simulation,
        latestState: timeline[timeline.length - 1] || null,
      };
    });

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulations,
      },
      toastMessage: "Advanced scenarios fetched successfully",
    });
  } catch (error) {
    console.error("[advanced-simulation] list failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to list advanced scenarios",
    });
  }
}

export async function compareAdvancedSimulations(req: Request, res: Response): Promise<void> {
  try {
    const idsParam = String(req.query.ids || "");
    const ids = idsParam
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);

    if (ids.length < 2) {
      res.status(400).json({
        status: 400,
        message: "At least two simulation ids are required",
        data: {},
        toastMessage: "Need at least two scenarios",
      });
      return;
    }

    const comparison = ids.map(id => {
      const simulation = advancedSimulationStore.simulations[id];
      if (!simulation) {
        return null;
      }
      const timeline = advancedSimulationStore.states[id] || [];
      return {
        simulation,
        timeline,
        latestState: timeline[timeline.length - 1] || null,
      };
    });

    if (comparison.some(item => item === null)) {
      res.status(404).json({
        status: 404,
        message: "One or more simulations were not found",
        data: {},
        toastMessage: "Scenario not found",
      });
      return;
    }

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        comparison: comparison.filter(Boolean),
      },
      toastMessage: "Advanced scenario comparison ready",
    });
  } catch (error) {
    console.error("[advanced-simulation] compare failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to compare scenarios",
    });
  }
}

export async function exportAdvancedSimulation(req: Request, res: Response): Promise<void> {
  try {
    const simulationId = String(req.params.id || "");
    const simulation = advancedSimulationStore.simulations[simulationId];

    if (!simulation) {
      res.status(404).json({
        status: 404,
        message: "Simulation not found",
        data: {},
        toastMessage: "Simulation not found",
      });
      return;
    }

    const timeline = getTimelineForCsv(advancedSimulationStore.states[simulationId]);
    const csv = csvFromTimeline(simulationId, timeline);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${simulationId}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error("[advanced-simulation] export failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to export scenario",
    });
  }
}
