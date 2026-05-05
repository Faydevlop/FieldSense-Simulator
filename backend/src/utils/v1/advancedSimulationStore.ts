import { AdvancedSimulation, AdvancedSimulationState } from "./advancedTypes";

interface AdvancedSimulationStore {
  simulations: Record<string, AdvancedSimulation>;
  states: Record<string, AdvancedSimulationState[]>;
}

export const advancedSimulationStore: AdvancedSimulationStore = {
  simulations: {},
  states: {},
};
