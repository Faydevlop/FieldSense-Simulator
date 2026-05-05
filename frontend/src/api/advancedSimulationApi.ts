import { ApiEnvelope } from "../types/simulation";
import { AdvancedRunRequest, AdvancedSimulation, AdvancedSimulationState, AdvancedStartRequest } from "../types/advancedSimulation";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7008/v1";

async function parseJsonResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }
  return payload;
}

async function requestJson<T>(path: string, options: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
  return parseJsonResponse<T>(response);
}

export async function startAdvancedSimulation(payload: AdvancedStartRequest): Promise<ApiEnvelope<{ simulationId: string; simulation: AdvancedSimulation; latestState: AdvancedSimulationState }>> {
  return requestJson("/simulation/advanced/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runAdvancedSimulation(payload: AdvancedRunRequest): Promise<ApiEnvelope<{ simulationId: string; currentDay: number; status: string; daysSimulated: number; latestState: AdvancedSimulationState | null }>> {
  return requestJson("/simulation/advanced/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdvancedSimulation(simulationId: string): Promise<ApiEnvelope<{ simulation: AdvancedSimulation; timeline: AdvancedSimulationState[] }>> {
  return requestJson(`/simulation/advanced/${simulationId}`, {
    method: "GET",
  });
}

export async function resetAdvancedSimulation(simulationId: string): Promise<ApiEnvelope<{ simulationId: string }>> {
  return requestJson("/simulation/advanced/reset", {
    method: "POST",
    body: JSON.stringify({ simulationId }),
  });
}

export async function listAdvancedSimulations(): Promise<ApiEnvelope<{ simulations: Array<{ simulation: AdvancedSimulation; latestState: AdvancedSimulationState | null }> }>> {
  return requestJson("/simulation/advanced", {
    method: "GET",
  });
}

export async function compareAdvancedSimulations(ids: string[]): Promise<ApiEnvelope<{ comparison: Array<{ simulation: AdvancedSimulation; timeline: AdvancedSimulationState[]; latestState: AdvancedSimulationState | null }> }>> {
  const query = encodeURIComponent(ids.join(","));
  return requestJson(`/simulation/advanced/compare?ids=${query}`, {
    method: "GET",
  });
}

export async function exportAdvancedSimulation(simulationId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/simulation/advanced/${simulationId}/export`);
  if (!response.ok) {
    throw new Error("Unable to export scenario");
  }
  return response.blob();
}
