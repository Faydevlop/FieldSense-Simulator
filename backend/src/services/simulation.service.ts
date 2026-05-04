import { simulateNextState } from "./simulationEngine";
import { simulationStore } from "../utils/v1/simulationStore";
import { ConditionLevel, PlantType, Simulation, SimulationState } from "../utils/v1/types";

const CONDITION_LEVELS: ConditionLevel[] = ["low", "medium", "high"];
const MIN_STRESS_THRESHOLD = 1;
const MAX_STRESS_THRESHOLD = 100;

export class SimulationServiceError extends Error {
  public readonly status: number;
  public readonly toastMessage: string;

  constructor(status: number, message: string, toastMessage: string) {
    super(message);
    this.name = "SimulationServiceError";
    this.status = status;
    this.toastMessage = toastMessage;
  }
}

interface StartSimulationInput {
  plantType: PlantType;
  water: ConditionLevel;
  sunlight: ConditionLevel;
}

interface StartSimulationResult {
  simulationId: string;
  currentDay: number;
  state: Pick<SimulationState, "growth" | "health" | "state">;
}

interface RunSimulationResult {
  simulationId: string;
  currentDay: number;
  status: Simulation["status"];
  daysSimulated: number;
  latestState: SimulationState | null;
}

interface GetSimulationResult {
  simulation: Simulation;
  timeline: SimulationState[];
}

interface ResetSimulationResult {
  simulationId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConditionLevel(value: unknown): value is ConditionLevel {
  return typeof value === "string" && CONDITION_LEVELS.includes(value as ConditionLevel);
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SimulationServiceError(400, `${field} must be a non-empty string`, `Invalid ${field}`);
  }
  return value.trim();
}

function assertPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new SimulationServiceError(400, `${field} must be a positive number`, `Invalid ${field}`);
  }
  return value;
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new SimulationServiceError(400, `${field} must be a positive integer`, `Invalid ${field}`);
  }
  return value;
}

function assertConditionLevel(value: unknown, field: string): ConditionLevel {
  if (!isConditionLevel(value)) {
    throw new SimulationServiceError(400, `${field} must be one of low, medium, high`, `Invalid ${field}`);
  }
  return value;
}

function assertStressThreshold(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < MIN_STRESS_THRESHOLD || value > MAX_STRESS_THRESHOLD) {
    throw new SimulationServiceError(400, "stressThreshold must be between 1 and 100", "Invalid stressThreshold");
  }
  return value;
}

function parsePlantType(rawPlantType: unknown): PlantType {
  if (!isRecord(rawPlantType)) {
    throw new SimulationServiceError(400, "plantType is required", "Invalid plantType");
  }

  return {
    id: assertNonEmptyString(rawPlantType.id, "plantType.id"),
    name: assertNonEmptyString(rawPlantType.name, "plantType.name"),
    idealWater: assertConditionLevel(rawPlantType.idealWater, "plantType.idealWater"),
    idealSunlight: assertConditionLevel(rawPlantType.idealSunlight, "plantType.idealSunlight"),
    growthRate: assertPositiveNumber(rawPlantType.growthRate, "plantType.growthRate"),
    stressThreshold: assertStressThreshold(rawPlantType.stressThreshold),
  };
}

function parseStartSimulationInput(payload: unknown): StartSimulationInput {
  if (!isRecord(payload)) {
    throw new SimulationServiceError(400, "Request body is required", "Invalid request body");
  }

  return {
    plantType: parsePlantType(payload.plantType),
    water: assertConditionLevel(payload.water, "water"),
    sunlight: assertConditionLevel(payload.sunlight, "sunlight"),
  };
}

function generateSimulationId(): string {
  const entropy = Math.random().toString(36).slice(2, 8);
  return `sim-${Date.now()}-${entropy}`;
}

function getSimulationById(simulationId: string): Simulation {
  const simulation = simulationStore.simulations[simulationId];
  if (!simulation) {
    throw new SimulationServiceError(404, "Simulation not found", "Simulation not found");
  }
  return simulation;
}

export async function startSimulation(payload: unknown): Promise<StartSimulationResult> {
  const input = parseStartSimulationInput(payload);
  const simulationId = generateSimulationId();

  const firstState = simulateNextState({
    day: 1,
    plantType: input.plantType,
    water: input.water,
    sunlight: input.sunlight,
    previousState: null,
  });

  const simulation: Simulation = {
    id: simulationId,
    plantType: input.plantType,
    currentDay: firstState.day,
    status: firstState.state === "dead" ? "completed" : "running",
  };

  simulationStore.simulations[simulationId] = simulation;
  simulationStore.states[simulationId] = [firstState];

  return {
    simulationId,
    currentDay: simulation.currentDay,
    state: {
      growth: firstState.growth,
      health: firstState.health,
      state: firstState.state,
    },
  };
}

export async function runSimulation(simulationIdRaw: unknown, daysRaw: unknown): Promise<RunSimulationResult> {
  const simulationId = assertNonEmptyString(simulationIdRaw, "simulationId");
  const days = assertPositiveInteger(daysRaw, "days");
  const simulation = getSimulationById(simulationId);
  const timeline = simulationStore.states[simulationId] || [];

  if (simulation.status === "completed") {
    return {
      simulationId,
      currentDay: simulation.currentDay,
      status: simulation.status,
      daysSimulated: 0,
      latestState: timeline[timeline.length - 1] || null,
    };
  }

  let previousState = timeline[timeline.length - 1] || null;
  let simulatedDays = 0;
  let completed = false;

  for (let index = 0; index < days; index += 1) {
    if (completed) {
      break;
    }

    const day = simulation.currentDay + 1;
    const water = previousState?.water || simulation.plantType.idealWater;
    const sunlight = previousState?.sunlight || simulation.plantType.idealSunlight;

    const nextState = simulateNextState({
      day,
      plantType: simulation.plantType,
      water,
      sunlight,
      previousState,
    });

    timeline.push(nextState);
    simulation.currentDay = day;
    previousState = nextState;
    simulatedDays += 1;

    if (nextState.state === "dead") {
      completed = true;
      simulation.status = "completed";
    }
  }

  if (!completed) {
    simulation.status = "running";
  }

  simulationStore.states[simulationId] = timeline;
  simulationStore.simulations[simulationId] = simulation;

  return {
    simulationId,
    currentDay: simulation.currentDay,
    status: simulation.status,
    daysSimulated: simulatedDays,
    latestState: timeline[timeline.length - 1] || null,
  };
}

export async function getSimulation(simulationIdRaw: unknown): Promise<GetSimulationResult> {
  const simulationId = assertNonEmptyString(simulationIdRaw, "simulationId");
  const simulation = getSimulationById(simulationId);

  return {
    simulation,
    timeline: simulationStore.states[simulationId] || [],
  };
}

export async function resetSimulation(simulationIdRaw: unknown): Promise<ResetSimulationResult> {
  const simulationId = assertNonEmptyString(simulationIdRaw, "simulationId");
  getSimulationById(simulationId);

  delete simulationStore.states[simulationId];
  delete simulationStore.simulations[simulationId];

  return { simulationId };
}
