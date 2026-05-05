import { GrowthStage, PlantHealthState, SimulationState } from "../types/simulation";

const seedSoil = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_57_57 AM.png", import.meta.url).href;
const sproutHealthy = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_24_06 AM.png", import.meta.url).href;
const growingHealthy = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_27_01 AM.png", import.meta.url).href;
const matureHealthy = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_29_21 AM.png", import.meta.url).href;
const declineHealthy = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_37_03 AM.png", import.meta.url).href;

const sproutStressed = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_51_58 AM.png", import.meta.url).href;
const growingStressed = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_53_13 AM.png", import.meta.url).href;
const matureStressed = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_54_43 AM.png", import.meta.url).href;
const declineStressed = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_57_20 AM.png", import.meta.url).href;

const sproutDead = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_42_09 AM.png", import.meta.url).href;
const growingDead = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_44_54 AM.png", import.meta.url).href;
const matureDead = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_46_04 AM.png", import.meta.url).href;
const declineDead = new URL("../../plant-images/ChatGPT Image May 5, 2026, 12_40_36 AM.png", import.meta.url).href;

const STAGE_IMAGE_MAP: Record<GrowthStage, Record<PlantHealthState, string>> = {
  seed: {
    healthy: seedSoil,
    stressed: seedSoil,
    dead: seedSoil,
  },
  sprout: {
    healthy: sproutHealthy,
    stressed: sproutStressed,
    dead: sproutDead,
  },
  growing: {
    healthy: growingHealthy,
    stressed: growingStressed,
    dead: growingDead,
  },
  mature: {
    healthy: matureHealthy,
    stressed: matureStressed,
    dead: matureDead,
  },
  decline: {
    healthy: declineHealthy,
    stressed: declineStressed,
    dead: declineDead,
  },
};

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  growing: "Growing",
  mature: "Mature",
  decline: "Decline",
};

export function resolveGrowthStage(state: SimulationState | null): GrowthStage {
  if (!state) {
    return "seed";
  }

  // Stage transitions are day-based so healthy/stressed/dead variants stay aligned at each level.
  if (state.day <= 1) {
    return "seed";
  }
  if (state.day <= 6) {
    return "sprout";
  }
  if (state.day <= 24) {
    return "growing";
  }
  if (state.day <= 40) {
    return "mature";
  }
  return "decline";
}

export function getPlantImage(stage: GrowthStage, healthState: PlantHealthState): string {
  return STAGE_IMAGE_MAP[stage][healthState];
}
