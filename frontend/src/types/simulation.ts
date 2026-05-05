export type ConditionLevel = "low" | "medium" | "high";
export type SimulationStatus = "running" | "completed";
export type PlantHealthState = "healthy" | "stressed" | "dead";
export type GrowthStage = "seed" | "sprout" | "growing" | "mature" | "decline";

export interface PlantType {
  id: string;
  name: string;
  idealWater: ConditionLevel;
  idealSunlight: ConditionLevel;
  growthRate: number;
  stressThreshold: number;
}

export interface SimulationState {
  day: number;
  water: ConditionLevel;
  sunlight: ConditionLevel;
  growth: number;
  health: number;
  state: PlantHealthState;
}

export interface Simulation {
  id: string;
  plantType: PlantType;
  currentDay: number;
  status: SimulationStatus;
}

export interface ApiEnvelope<T> {
  status: number;
  message: string;
  data: T;
  toastMessage: string;
}

export interface StartSimulationRequest {
  plantType: PlantType;
  water: ConditionLevel;
  sunlight: ConditionLevel;
}

export interface StartSimulationResponse {
  simulationId: string;
  currentDay: number;
  state: Pick<SimulationState, "growth" | "health" | "state">;
}

export interface RunSimulationRequest {
  simulationId: string;
  days: number;
  water?: ConditionLevel;
  sunlight?: ConditionLevel;
}

export interface RunSimulationResponse {
  simulationId: string;
  currentDay: number;
  status: SimulationStatus;
  daysSimulated: number;
  latestState: SimulationState | null;
}

export interface GetSimulationResponse {
  simulation: Simulation;
  timeline: SimulationState[];
}

export interface ResetSimulationResponse {
  simulationId: string;
}

export interface ControlValues {
  water: ConditionLevel;
  sunlight: ConditionLevel;
}
