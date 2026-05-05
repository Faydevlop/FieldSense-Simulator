import {
  ApiEnvelope,
  GetSimulationResponse,
  ResetSimulationResponse,
  RunSimulationRequest,
  RunSimulationResponse,
  StartSimulationRequest,
  StartSimulationResponse,
} from "../types/simulation";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7008/v1";

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    const errorMessage = payload?.message || "Request failed";
    throw new Error(errorMessage);
  }

  return payload;
}

async function request<T>(path: string, options: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  return parseResponse<T>(response);
}

export async function startSimulation(payload: StartSimulationRequest): Promise<ApiEnvelope<StartSimulationResponse>> {
  return request<StartSimulationResponse>("/simulation/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runSimulation(payload: RunSimulationRequest): Promise<ApiEnvelope<RunSimulationResponse>> {
  return request<RunSimulationResponse>("/simulation/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSimulation(simulationId: string): Promise<ApiEnvelope<GetSimulationResponse>> {
  return request<GetSimulationResponse>(`/simulation/${simulationId}`, {
    method: "GET",
  });
}

export async function resetSimulation(simulationId: string): Promise<ApiEnvelope<ResetSimulationResponse>> {
  return request<ResetSimulationResponse>("/simulation/reset", {
    method: "POST",
    body: JSON.stringify({ simulationId }),
  });
}
