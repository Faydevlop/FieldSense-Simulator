import { Request, Response } from "express";
import { simulateNextState } from "../../services/simulationEngine";
import { simulationStore } from "../../utils/v1/simulationStore";
import { ConditionLevel, PlantType, Simulation } from "../../utils/v1/types";

const CONDITION_LEVELS = ["low", "medium", "high"];

export async function startSimulation(req: Request, res: Response): Promise<void> {
  try {
    const { plantType, water, sunlight } = req.body || {};

    const waterLevel = typeof water === "string" ? water.trim().toLowerCase() : "";
    const sunlightLevel = typeof sunlight === "string" ? sunlight.trim().toLowerCase() : "";

    if (!plantType || typeof plantType !== "object") {
      res.status(400).json({
        status: 400,
        message: "plantType is required",
        data: {},
        toastMessage: "Invalid plantType",
      });
      return;
    }

    if (!plantType.id || !plantType.name) {
      res.status(400).json({
        status: 400,
        message: "plantType id and name are required",
        data: {},
        toastMessage: "Invalid plantType",
      });
      return;
    }

    if (!CONDITION_LEVELS.includes(plantType.idealWater) || !CONDITION_LEVELS.includes(plantType.idealSunlight)) {
      res.status(400).json({
        status: 400,
        message: "plantType idealWater and idealSunlight must be low, medium, or high",
        data: {},
        toastMessage: "Invalid plantType conditions",
      });
      return;
    }

    if (typeof plantType.growthRate !== "number" || plantType.growthRate <= 0) {
      res.status(400).json({
        status: 400,
        message: "plantType growthRate must be a positive number",
        data: {},
        toastMessage: "Invalid growthRate",
      });
      return;
    }

    if (typeof plantType.stressThreshold !== "number" || plantType.stressThreshold < 1 || plantType.stressThreshold > 100) {
      res.status(400).json({
        status: 400,
        message: "plantType stressThreshold must be between 1 and 100",
        data: {},
        toastMessage: "Invalid stressThreshold",
      });
      return;
    }

    if (!CONDITION_LEVELS.includes(waterLevel) || !CONDITION_LEVELS.includes(sunlightLevel)) {
      res.status(400).json({
        status: 400,
        message: "water and sunlight must be low, medium, or high",
        data: {},
        toastMessage: "Invalid environment levels",
      });
      return;
    }

    const simulationId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cleanPlantType: PlantType = {
      id: String(plantType.id),
      name: String(plantType.name),
      idealWater: plantType.idealWater,
      idealSunlight: plantType.idealSunlight,
      growthRate: plantType.growthRate,
      stressThreshold: plantType.stressThreshold,
    };

    // Keep rule math in the engine so this controller stays about requests and responses.
    const firstState = simulateNextState({
      day: 1,
      plantType: cleanPlantType,
      water: waterLevel as ConditionLevel,
      sunlight: sunlightLevel as ConditionLevel,
      previousState: null,
    });

    const simulation: Simulation = {
      id: simulationId,
      plantType: cleanPlantType,
      currentDay: 1,
      status: firstState.state === "dead" ? "completed" : "running",
    };

    simulationStore.simulations[simulationId] = simulation;
    simulationStore.states[simulationId] = [firstState];

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulationId,
        currentDay: simulation.currentDay,
        state: {
          growth: firstState.growth,
          health: firstState.health,
          state: firstState.state,
        },
      },
      toastMessage: "Simulation started successfully",
    });
  } catch (error) {
    console.error("[simulation] start failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to start simulation",
    });
  }
}

export async function runSimulation(req: Request, res: Response): Promise<void> {
  try {
    const { simulationId, days, water, sunlight } = req.body || {};

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

    const simulation = simulationStore.simulations[simulationId];
    if (!simulation) {
      res.status(404).json({
        status: 404,
        message: "Simulation not found",
        data: {},
        toastMessage: "Simulation not found",
      });
      return;
    }

    const waterLevel = typeof water === "string" ? water.trim().toLowerCase() : "";
    const sunlightLevel = typeof sunlight === "string" ? sunlight.trim().toLowerCase() : "";

    if ((waterLevel && !CONDITION_LEVELS.includes(waterLevel)) || (sunlightLevel && !CONDITION_LEVELS.includes(sunlightLevel))) {
      res.status(400).json({
        status: 400,
        message: "water and sunlight must be low, medium, or high",
        data: {},
        toastMessage: "Invalid environment levels",
      });
      return;
    }

    const timeline = simulationStore.states[simulationId] || [];

    if (simulation.status === "completed") {
      res.status(200).json({
        status: 200,
        message: "success",
        data: {
          simulationId,
          currentDay: simulation.currentDay,
          status: simulation.status,
          daysSimulated: 0,
          latestState: timeline[timeline.length - 1] || null,
        },
        toastMessage: "Simulation ran successfully",
      });
      return;
    }

    let previousState = timeline[timeline.length - 1] || null;
    let daysSimulated = 0;

    for (let index = 0; index < days; index += 1) {
      const nextDay = simulation.currentDay + 1;
      const nextState = simulateNextState({
        day: nextDay,
        plantType: simulation.plantType,
        water: (waterLevel || previousState?.water || simulation.plantType.idealWater) as ConditionLevel,
        sunlight: (sunlightLevel || previousState?.sunlight || simulation.plantType.idealSunlight) as ConditionLevel,
        previousState,
      });

      timeline.push(nextState);
      simulation.currentDay = nextDay;
      previousState = nextState;
      daysSimulated += 1;

      if (nextState.state === "dead") {
        simulation.status = "completed";
        break;
      }
    }

    if (simulation.status !== "completed") {
      simulation.status = "running";
    }

    simulationStore.simulations[simulationId] = simulation;
    simulationStore.states[simulationId] = timeline;

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulationId,
        currentDay: simulation.currentDay,
        status: simulation.status,
        daysSimulated,
        latestState: timeline[timeline.length - 1] || null,
      },
      toastMessage: "Simulation ran successfully",
    });
  } catch (error) {
    console.error("[simulation] run failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to run simulation",
    });
  }
}

export async function getSimulation(req: Request, res: Response): Promise<void> {
  try {
    const simulationId = String(req.params.id || "");
    const simulation = simulationStore.simulations[simulationId];

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
        timeline: simulationStore.states[simulationId] || [],
      },
      toastMessage: "Simulation fetched successfully",
    });
  } catch (error) {
    console.error("[simulation] fetch failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to fetch simulation",
    });
  }
}

export async function resetSimulation(req: Request, res: Response): Promise<void> {
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

    if (!simulationStore.simulations[simulationId]) {
      res.status(404).json({
        status: 404,
        message: "Simulation not found",
        data: {},
        toastMessage: "Simulation not found",
      });
      return;
    }

    delete simulationStore.states[simulationId];
    delete simulationStore.simulations[simulationId];

    res.status(200).json({
      status: 200,
      message: "success",
      data: {
        simulationId,
      },
      toastMessage: "Simulation reset successfully",
    });
  } catch (error) {
    console.error("[simulation] reset failed", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: {},
      toastMessage: "Unable to reset simulation",
    });
  }
}
