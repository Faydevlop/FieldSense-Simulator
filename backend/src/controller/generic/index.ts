import { Request, Response } from "express";
import {
  COLLECTIONS,
  USER_ROLES,
  ENVIRONMENT,
  UserType,
  Actions,
  Modifications,
} from "../../utils/v1/constants";
import {
  getSimulation as getSimulationService,
  resetSimulation as resetSimulationService,
  runSimulation as runSimulationService,
  SimulationServiceError,
  startSimulation as startSimulationService,
} from "../../services/simulation.service";

function sendSuccess<T>(
  res: Response,
  data: T,
  toastMessage: string,
  statusCode = 200,
  message = "success",
): void {
  res.status(statusCode).json({
    status: statusCode,
    message,
    data,
    toastMessage,
  });
}

function sendError(res: Response, error: unknown, fallbackToastMessage: string): void {
  if (error instanceof SimulationServiceError) {
    res.status(error.status).json({
      status: error.status,
      message: error.message,
      data: {},
      toastMessage: error.toastMessage,
    });
    return;
  }

  console.error("[controller] generic error", error);
  res.status(500).json({
    status: 500,
    message: "Internal server error",
    data: {},
    toastMessage: fallbackToastMessage,
  });
}

export function getAllConstants(_req: Request, res: Response): void {
  sendSuccess(
    res,
    {
      COLLECTIONS,
      USER_ROLES,
      ENVIRONMENT,
      UserType,
      Actions,
      Modifications,
    },
    "successfully fetched details",
  );
}

export async function startSimulation(req: Request, res: Response): Promise<void> {
  try {
    const result = await startSimulationService(req.body);
    sendSuccess(res, result, "Simulation started successfully");
  } catch (error) {
    sendError(res, error, "Unable to start simulation");
  }
}

export async function runSimulation(req: Request, res: Response): Promise<void> {
  try {
    const result = await runSimulationService(req.body?.simulationId, req.body?.days);
    sendSuccess(res, result, "Simulation ran successfully");
  } catch (error) {
    sendError(res, error, "Unable to run simulation");
  }
}

export async function getSimulation(req: Request, res: Response): Promise<void> {
  try {
    const result = await getSimulationService(req.params.id);
    sendSuccess(res, result, "Simulation fetched successfully");
  } catch (error) {
    sendError(res, error, "Unable to fetch simulation");
  }
}

export async function resetSimulation(req: Request, res: Response): Promise<void> {
  try {
    const result = await resetSimulationService(req.body?.simulationId);
    sendSuccess(res, result, "Simulation reset successfully");
  } catch (error) {
    sendError(res, error, "Unable to reset simulation");
  }
}
