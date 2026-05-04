import { Simulation, SimulationState } from "./types";

interface SimulationStore {
  simulations: Record<string, Simulation>;
  states: Record<string, SimulationState[]>;
}

export const simulationStore: SimulationStore = {
  simulations: {},
  states: {},
};
