export type ConditionLevel = "low" | "medium" | "high";
export type SimulationRunStatus = "running" | "completed";
export type PlantHealthState = "healthy" | "stressed" | "dead";

export interface PlantType {
  id: string;
  name: string;
  idealWater: ConditionLevel;
  idealSunlight: ConditionLevel;
  growthRate: number;
  stressThreshold: number;
}

export interface Simulation {
  id: string;
  plantType: PlantType;
  currentDay: number;
  status: SimulationRunStatus;
}

export interface SimulationState {
  day: number;
  water: ConditionLevel;
  sunlight: ConditionLevel;
  growth: number;
  health: number;
  state: PlantHealthState;
}
