import rulesConfig from "../config/v1/advancedRules.json";
import { AdvancedControls, AdvancedRule, AdvancedSimulationState } from "../utils/v1/advancedTypes";
import { ConditionLevel, PlantHealthState, PlantType, Simulation, SimulationRunStatus, SimulationState } from "../utils/v1/types";

const DAY_ONE_HEALTH = 100;
const DEAD_HEALTH_THRESHOLD = 20;
const MIN_HEALTH = 0;
const MAX_HEALTH = 100;

const DAY_ONE_STRESS = 20;
const MIN_STRESS = 0;
const MAX_STRESS = 100;

const CONDITION_MAPPERS: ReadonlyArray<{
  actual: "water" | "sunlight";
  ideal: "idealWater" | "idealSunlight";
}> = [
  { actual: "water", ideal: "idealWater" },
  { actual: "sunlight", ideal: "idealSunlight" },
];

interface StandardSimulationEngineInput {
  isAdvanced?: false;
  day: number;
  plantType: PlantType;
  water: ConditionLevel;
  sunlight: ConditionLevel;
  previousState: Pick<SimulationState, "growth" | "health" | "state"> | null;
}

interface AdvancedSimulationEngineInput {
  isAdvanced: true;
  day: number;
  plantType: PlantType;
  controls: AdvancedControls;
  previousState: Pick<AdvancedSimulationState, "growth" | "health" | "stress" | "state"> | null;
  uncertaintyEnabled: boolean;
  uncertaintyIntensity: number;
  randomState: number;
}

interface ConditionStats {
  matches: number;
  mismatches: number;
}

interface StandardSimulateDaysInput {
  isAdvanced?: false;
  simulation: Pick<Simulation, "currentDay" | "status" | "plantType">;
  timeline: SimulationState[];
  days: number;
  waterOverride?: ConditionLevel;
  sunlightOverride?: ConditionLevel;
}

interface StandardSimulateDaysResult {
  timeline: SimulationState[];
  currentDay: number;
  status: SimulationRunStatus;
  daysSimulated: number;
  latestState: SimulationState | null;
}

interface AdvancedSimulateDaysInput {
  isAdvanced: true;
  plantType: PlantType;
  timeline: AdvancedSimulationState[];
  days: number;
  currentDay: number;
  status: SimulationRunStatus;
  controlsOverride?: Partial<AdvancedControls>;
  uncertaintyEnabled: boolean;
  uncertaintyIntensity: number;
  randomState: number;
}

interface AdvancedSimulationDaysResult {
  timeline: AdvancedSimulationState[];
  daysSimulated: number;
  currentDay: number;
  status: SimulationRunStatus;
  latestState: AdvancedSimulationState | null;
  randomState: number;
}

interface AdvancedNextStateResult {
  nextState: AdvancedSimulationState;
  randomState: number;
}

interface RandomResult {
  value: number;
  state: number;
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

function resolveStandardPlantState(health: number, stressThreshold: number): PlantHealthState {
  const stateRules: ReadonlyArray<{ state: PlantHealthState; isMatch: (currentHealth: number) => boolean }> = [
    { state: "dead", isMatch: currentHealth => currentHealth < DEAD_HEALTH_THRESHOLD },
    { state: "stressed", isMatch: currentHealth => currentHealth < stressThreshold },
    { state: "healthy", isMatch: () => true },
  ];

  return stateRules.find(rule => rule.isMatch(health))?.state || "healthy";
}

function simulateStandardNextState({
  day,
  plantType,
  water,
  sunlight,
  previousState,
}: StandardSimulationEngineInput): SimulationState {
  const baseHealth = previousState?.health ?? DAY_ONE_HEALTH;
  const baseGrowth = previousState?.growth ?? 0;
  const baseState = previousState?.state ?? "healthy";
  const conditionStats = getConditionStats(plantType, water, sunlight);

  const nextHealth = clamp(baseHealth + getHealthDelta(conditionStats.matches, conditionStats.mismatches), MIN_HEALTH, MAX_HEALTH);
  const nextState = resolveStandardPlantState(nextHealth, plantType.stressThreshold);
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

function nextRandom(currentState: number): RandomResult {
  const nextState = (currentState * 1664525 + 1013904223) >>> 0;
  return {
    value: nextState / 4294967296,
    state: nextState,
  };
}

function normalizeUncertaintyIntensity(value: number): number {
  return clamp(value, 0, 0.6);
}

function applyUncertainty(baseValue: number, enabled: boolean, intensity: number, state: number): { value: number; state: number } {
  if (!enabled || baseValue === 0 || intensity <= 0) {
    return { value: baseValue, state };
  }

  const random = nextRandom(state);
  const jitter = (random.value * 2 - 1) * intensity;
  return {
    value: baseValue * (1 + jitter),
    state: random.state,
  };
}

function controlsMatch(rule: AdvancedRule, controls: AdvancedControls): boolean {
  const conditionChecks: Array<readonly [unknown, unknown[] | undefined]> = [
    [controls.water, rule.conditions.water],
    [controls.sunlight, rule.conditions.sunlight],
    [controls.soilMoisture, rule.conditions.soilMoisture],
    [controls.humidity, rule.conditions.humidity],
    [controls.temperature, rule.conditions.temperature],
    [controls.fertilizerLevel, rule.conditions.fertilizerLevel],
    [controls.soilType, rule.conditions.soilType],
  ];

  return conditionChecks.every(([actual, expected]) => {
    if (!expected || expected.length === 0) {
      return true;
    }

    return expected.includes(actual as never);
  });
}

function resolveAdvancedPlantState(health: number, stress: number, stressThreshold: number): PlantHealthState {
  if (health < DEAD_HEALTH_THRESHOLD) {
    return "dead";
  }

  if (health < stressThreshold || stress > 55) {
    return "stressed";
  }

  return "healthy";
}

function controlsFromOverride(previousControls: AdvancedControls, overrides?: Partial<AdvancedControls>): AdvancedControls {
  return {
    ...previousControls,
    ...overrides,
  };
}

function withBaselineStress(plantType: PlantType, controls: AdvancedControls): number {
  let baseline = 0;

  if (controls.water !== plantType.idealWater) {
    baseline += 5;
  } else {
    baseline -= 2;
  }

  if (controls.sunlight !== plantType.idealSunlight) {
    baseline += 5;
  } else {
    baseline -= 2;
  }

  if (controls.temperature === "high" && controls.humidity === "low") {
    baseline += 4;
  }

  if (controls.fertilizerLevel === "high" && controls.soilMoisture === "low") {
    baseline += 4;
  }

  return baseline;
}

function simulateAdvancedNextStateInternal({
  day,
  plantType,
  controls,
  previousState,
  uncertaintyEnabled,
  uncertaintyIntensity,
  randomState,
}: AdvancedSimulationEngineInput): AdvancedNextStateResult {
  const rules = (rulesConfig as AdvancedRule[]).slice().sort((a, b) => b.priority - a.priority);
  const baseHealth = previousState?.health ?? DAY_ONE_HEALTH;
  const baseGrowth = previousState?.growth ?? 0;
  const baseStress = previousState?.stress ?? DAY_ONE_STRESS;
  const basePlantState = previousState?.state ?? "healthy";

  let runningRandomState = randomState;
  const normalizedUncertainty = normalizeUncertaintyIntensity(uncertaintyIntensity);
  let healthDelta = 0;
  let growthDelta = 0;
  let growthMultiplier = 1;
  let stressDelta = withBaselineStress(plantType, controls);
  const appliedRuleIds: string[] = [];
  const appliedRuleNotes: string[] = [];

  for (const rule of rules) {
    if (!controlsMatch(rule, controls)) {
      continue;
    }

    const probabilityRoll = nextRandom(runningRandomState);
    runningRandomState = probabilityRoll.state;
    const probability = clamp(rule.probability ?? 1, 0, 1);
    if (probabilityRoll.value > probability) {
      continue;
    }

    appliedRuleIds.push(rule.id);
    if (rule.note) {
      appliedRuleNotes.push(rule.note);
    }

    const uncertainHealth = applyUncertainty(rule.effects.healthDelta ?? 0, uncertaintyEnabled, normalizedUncertainty, runningRandomState);
    runningRandomState = uncertainHealth.state;
    const uncertainGrowth = applyUncertainty(rule.effects.growthDelta ?? 0, uncertaintyEnabled, normalizedUncertainty, runningRandomState);
    runningRandomState = uncertainGrowth.state;
    const uncertainMultiplier = applyUncertainty(rule.effects.growthMultiplier ?? 0, uncertaintyEnabled, normalizedUncertainty, runningRandomState);
    runningRandomState = uncertainMultiplier.state;
    const uncertainStress = applyUncertainty(rule.effects.stressDelta ?? 0, uncertaintyEnabled, normalizedUncertainty, runningRandomState);
    runningRandomState = uncertainStress.state;

    healthDelta += uncertainHealth.value;
    growthDelta += uncertainGrowth.value;
    growthMultiplier += uncertainMultiplier.value;
    stressDelta += uncertainStress.value;
  }

  const nextStress = clamp(baseStress + stressDelta, MIN_STRESS, MAX_STRESS);
  const stressPenaltyOnHealth = Math.max(0, (nextStress - 60) * 0.12);
  const nextHealth = clamp(baseHealth + healthDelta - stressPenaltyOnHealth, MIN_HEALTH, MAX_HEALTH);
  const state = resolveAdvancedPlantState(nextHealth, nextStress, plantType.stressThreshold);
  const stressPenaltyOnGrowth = Math.max(0, (nextStress - 70) * 0.08);
  let totalGrowthDelta = plantType.growthRate * growthMultiplier + growthDelta - stressPenaltyOnGrowth;

  if (basePlantState === "dead" || state === "dead") {
    totalGrowthDelta = 0;
  }

  const nextGrowth = roundToTwo(Math.max(0, baseGrowth + Math.max(0, totalGrowthDelta)));

  return {
    nextState: {
      day,
      controls,
      growth: nextGrowth,
      health: roundToTwo(nextHealth),
      stress: roundToTwo(nextStress),
      state,
      appliedRuleIds,
      appliedRuleNotes,
    },
    randomState: runningRandomState,
  };
}

function simulateStandardDays({ simulation, timeline, days, waterOverride, sunlightOverride }: StandardSimulateDaysInput): StandardSimulateDaysResult {
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
    const nextState = simulateStandardNextState({
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

function simulateAdvancedDaysInternal({
  plantType,
  timeline,
  days,
  currentDay,
  status,
  controlsOverride,
  uncertaintyEnabled,
  uncertaintyIntensity,
  randomState,
}: AdvancedSimulateDaysInput): AdvancedSimulationDaysResult {
  const nextTimeline = [...timeline];
  let nextDay = currentDay;
  let nextStatus: SimulationRunStatus = status;
  let daysSimulated = 0;
  let previousState = nextTimeline[nextTimeline.length - 1] || null;
  let nextRandomState = randomState;

  if (nextStatus === "completed") {
    return {
      timeline: nextTimeline,
      daysSimulated: 0,
      currentDay,
      status: nextStatus,
      latestState: previousState,
      randomState: nextRandomState,
    };
  }

  for (let index = 0; index < days; index += 1) {
    nextDay += 1;

    const currentControls = previousState
      ? controlsFromOverride(previousState.controls, controlsOverride)
      : controlsFromOverride(
          {
            water: plantType.idealWater,
            sunlight: plantType.idealSunlight,
            soilMoisture: "medium",
            humidity: "medium",
            temperature: "medium",
            fertilizerLevel: "medium",
            soilType: "loamy",
          },
          controlsOverride,
        );

    const simulationResult = simulateAdvancedNextStateInternal({
      isAdvanced: true,
      day: nextDay,
      plantType,
      controls: currentControls,
      previousState,
      uncertaintyEnabled,
      uncertaintyIntensity,
      randomState: nextRandomState,
    });

    nextRandomState = simulationResult.randomState;
    previousState = simulationResult.nextState;
    nextTimeline.push(simulationResult.nextState);
    daysSimulated += 1;

    if (simulationResult.nextState.state === "dead") {
      nextStatus = "completed";
      break;
    }
  }

  if (nextStatus !== "completed") {
    nextStatus = "running";
  }

  return {
    timeline: nextTimeline,
    daysSimulated,
    currentDay: nextDay,
    status: nextStatus,
    latestState: previousState,
    randomState: nextRandomState,
  };
}

export function simulateEngineNextState(input: StandardSimulationEngineInput): SimulationState;
export function simulateEngineNextState(input: AdvancedSimulationEngineInput): AdvancedNextStateResult;
export function simulateEngineNextState(input: StandardSimulationEngineInput | AdvancedSimulationEngineInput): SimulationState | AdvancedNextStateResult {
  if (input.isAdvanced) {
    return simulateAdvancedNextStateInternal(input);
  }

  return simulateStandardNextState(input);
}

export function simulateEngineDays(input: StandardSimulateDaysInput): StandardSimulateDaysResult;
export function simulateEngineDays(input: AdvancedSimulateDaysInput): AdvancedSimulationDaysResult;
export function simulateEngineDays(input: StandardSimulateDaysInput | AdvancedSimulateDaysInput): StandardSimulateDaysResult | AdvancedSimulationDaysResult {
  if (input.isAdvanced) {
    return simulateAdvancedDaysInternal(input);
  }

  return simulateStandardDays(input);
}

export function simulateNextState(input: Omit<StandardSimulationEngineInput, "isAdvanced">): SimulationState {
  return simulateEngineNextState({
    ...input,
    isAdvanced: false,
  });
}

export function simulateDays(input: Omit<StandardSimulateDaysInput, "isAdvanced">): StandardSimulateDaysResult {
  return simulateEngineDays({
    ...input,
    isAdvanced: false,
  });
}

export function simulateAdvancedNextState(input: Omit<AdvancedSimulationEngineInput, "isAdvanced">): AdvancedNextStateResult {
  return simulateEngineNextState({
    ...input,
    isAdvanced: true,
  });
}

export function simulateAdvancedDays(input: Omit<AdvancedSimulateDaysInput, "isAdvanced">): AdvancedSimulationDaysResult {
  return simulateEngineDays({
    ...input,
    isAdvanced: true,
  });
}
