import { ConditionLevel, PlantHealthState, PlantType, Simulation, SimulationRunStatus, SimulationState } from "../utils/v1/types";

const DAY_ONE_HEALTH = 100;
const DEAD_HEALTH_THRESHOLD = 20;
const MIN_HEALTH = 0;
const MAX_HEALTH = 100;

const CONDITION_MAPPERS: ReadonlyArray<{
  actual: "water" | "sunlight";
  ideal: "idealWater" | "idealSunlight";
}> = [
  { actual: "water", ideal: "idealWater" },
  { actual: "sunlight", ideal: "idealSunlight" },
];

interface SimulationEngineInput {
  day: number;
  plantType: PlantType;
  water: ConditionLevel;
  sunlight: ConditionLevel;
  previousState: Pick<SimulationState, "growth" | "health" | "state"> | null;
}

interface ConditionStats {
  matches: number;
  mismatches: number;
}

interface SimulateDaysInput {
  simulation: Pick<Simulation, "currentDay" | "status" | "plantType">;
  timeline: SimulationState[];
  days: number;
  waterOverride?: ConditionLevel;
  sunlightOverride?: ConditionLevel;
}

interface SimulateDaysResult {
  timeline: SimulationState[];
  currentDay: number;
  status: SimulationRunStatus;
  daysSimulated: number;
  latestState: SimulationState | null;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getConditionStats(plantType: PlantType, water: ConditionLevel, sunlight: ConditionLevel): ConditionStats {
  const actuals: Record<"water" | "sunlight", ConditionLevel> = { water, sunlight };

  return CONDITION_MAPPERS.reduce<ConditionStats>(
    (stats, mapper) => {
      const isMatch = actuals[mapper.actual] === plantType[mapper.ideal];
      return {
        matches: stats.matches + (isMatch ? 1 : 0),
        mismatches: stats.mismatches + (isMatch ? 0 : 1),
      };
    },
    { matches: 0, mismatches: 0 },
  );
}

function getHealthDelta(matches: number, mismatches: number): number {
  return matches * 2 - mismatches * 12;
}

function getGrowthDelta(growthRate: number, matches: number, mismatches: number, currentState: PlantHealthState): number {
  if (currentState === "dead") {
    return 0;
  }

  const multiplier = 1 + matches * 0.35 - mismatches * 0.3;
  return roundToTwo(Math.max(0, growthRate * multiplier));
}

function resolvePlantState(health: number, stressThreshold: number): PlantHealthState {
  const stateRules: ReadonlyArray<{ state: PlantHealthState; isMatch: (currentHealth: number) => boolean }> = [
    { state: "dead", isMatch: currentHealth => currentHealth < DEAD_HEALTH_THRESHOLD },
    { state: "stressed", isMatch: currentHealth => currentHealth < stressThreshold },
    { state: "healthy", isMatch: () => true },
  ];

  return stateRules.find(rule => rule.isMatch(health))?.state || "healthy";
}

export function simulateNextState({
  day,
  plantType,
  water,
  sunlight,
  previousState,
}: SimulationEngineInput): SimulationState {
  const baseHealth = previousState?.health ?? DAY_ONE_HEALTH;
  const baseGrowth = previousState?.growth ?? 0;
  const baseState = previousState?.state ?? "healthy";
  const conditionStats = getConditionStats(plantType, water, sunlight);

  const nextHealth = clamp(baseHealth + getHealthDelta(conditionStats.matches, conditionStats.mismatches), MIN_HEALTH, MAX_HEALTH);
  const nextState = resolvePlantState(nextHealth, plantType.stressThreshold);
  const growthDelta = getGrowthDelta(plantType.growthRate, conditionStats.matches, conditionStats.mismatches, baseState);

  return {
    day,
    water,
    sunlight,
    growth: roundToTwo(baseGrowth + growthDelta),
    health: roundToTwo(nextHealth),
    state: nextState,
  };
}

export function simulateDays({ simulation, timeline, days, waterOverride, sunlightOverride }: SimulateDaysInput): SimulateDaysResult {
  const nextTimeline = [...timeline];

  if (simulation.status === "completed") {
    return {
      timeline: nextTimeline,
      currentDay: simulation.currentDay,
      status: simulation.status,
      daysSimulated: 0,
      latestState: nextTimeline[nextTimeline.length - 1] || null,
    };
  }

  let previousState = nextTimeline[nextTimeline.length - 1] || null;
  let currentDay = simulation.currentDay;
  let status: SimulationRunStatus = simulation.status;
  let daysSimulated = 0;

  for (let index = 0; index < days; index += 1) {
    const nextDay = currentDay + 1;
    const nextState = simulateNextState({
      day: nextDay,
      plantType: simulation.plantType,
      water: (waterOverride || previousState?.water || simulation.plantType.idealWater) as ConditionLevel,
      sunlight: (sunlightOverride || previousState?.sunlight || simulation.plantType.idealSunlight) as ConditionLevel,
      previousState,
    });

    nextTimeline.push(nextState);
    currentDay = nextDay;
    previousState = nextState;
    daysSimulated += 1;

    if (nextState.state === "dead") {
      status = "completed";
      break;
    }
  }

  if (status !== "completed") {
    status = "running";
  }

  return {
    timeline: nextTimeline,
    currentDay,
    status,
    daysSimulated,
    latestState: nextTimeline[nextTimeline.length - 1] || null,
  };
}
