import { ConditionLevel, PlantHealthState, PlantType, SimulationRunStatus } from "./types";

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

export interface UncertaintyMode {
  enabled: boolean;
  intensity?: number;
  seed?: number;
}

export interface AdvancedRuleConditions {
  water?: ConditionLevel[];
  sunlight?: ConditionLevel[];
  soilMoisture?: ConditionLevel[];
  humidity?: ConditionLevel[];
  temperature?: ConditionLevel[];
  fertilizerLevel?: ConditionLevel[];
  soilType?: SoilType[];
}

export interface AdvancedRuleEffects {
  healthDelta?: number;
  growthDelta?: number;
  growthMultiplier?: number;
  stressDelta?: number;
}

export interface AdvancedRule {
  id: string;
  priority: number;
  probability: number;
  conditions: AdvancedRuleConditions;
  effects: AdvancedRuleEffects;
  note?: string;
}

export interface AdvancedSimulation {
  id: string;
  name: string;
  plantType: PlantType;
  currentDay: number;
  status: SimulationRunStatus;
  uncertaintyMode: Required<Pick<UncertaintyMode, "enabled" | "intensity">>;
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

export interface AdvancedStartSimulationRequest {
  plantType: PlantType;
  controls: AdvancedControls;
  scenarioName?: string;
  uncertaintyMode?: UncertaintyMode;
}

export interface AdvancedRunSimulationRequest {
  simulationId: string;
  days: number;
  controls?: Partial<AdvancedControls>;
  uncertaintyMode?: UncertaintyMode;
}
