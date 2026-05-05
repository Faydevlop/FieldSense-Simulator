import { ConditionLevel, PlantHealthState, PlantType, SimulationStatus } from "./simulation";

export type SoilType = "loamy" | "clay" | "sandy";

export interface AdvancedControls {
  water: ConditionLevel;
  sunlight: ConditionLevel;
  soilMoisture: ConditionLevel;
  humidity: ConditionLevel;
  temperature: ConditionLevel;
  fertilizerLevel: ConditionLevel;
  soilType?: SoilType;
}

export interface AdvancedUncertaintyMode {
  enabled: boolean;
  intensity?: number;
  seed?: number;
}

export interface AdvancedSimulation {
  id: string;
  name: string;
  plantType: PlantType;
  currentDay: number;
  status: SimulationStatus;
  uncertaintyMode: {
    enabled: boolean;
    intensity: number;
  };
  randomState: number;
  createdAt: string;
}

export interface AdvancedSimulationState {
  day: number;
  controls: AdvancedControls;
  growth: number;
  health: number;
  stress: number;
  state: PlantHealthState;
  appliedRuleIds: string[];
  appliedRuleNotes: string[];
}

export interface AdvancedStartRequest {
  plantType: PlantType;
  controls: AdvancedControls;
  scenarioName?: string;
  uncertaintyMode?: AdvancedUncertaintyMode;
}

export interface AdvancedRunRequest {
  simulationId: string;
  days: number;
  controls?: Partial<AdvancedControls>;
  uncertaintyMode?: AdvancedUncertaintyMode;
}
