# FieldSense Runbook

This runbook explains how the simulation works, how to extend it, and current limitations, aligned with the assessment prompts.

## 1) How the Simulation Works

## Request Flow

1. Frontend sends simulation requests to backend APIs.
2. Backend controllers validate payloads and normalize inputs.
3. Controllers call the simulation engine.
4. Engine computes next state(s) across time steps.
5. Backend stores timeline in memory and returns current status + latest state.

## Engine Modes

The engine has one shared core with two modes:

- Standard mode (`isAdvanced: false`)
- Advanced mode (`isAdvanced: true`)

File:

- `backend/src/services/simulationEngine.ts`

## Standard Mode (Base Scenario)

Inputs:

- `water`: low | medium | high
- `sunlight`: low | medium | high

Per-day logic:

1. Compare actual levels against plant ideals.
2. Compute matches vs mismatches.
3. Update health using match/mismatch deltas.
4. Resolve state (`healthy`, `stressed`, `dead`) using health thresholds.
5. Update growth based on growth rate + condition multiplier.
6. Append the day result to timeline.

State evolution:

- Runs from Day 1 to Day N
- Stops early if state becomes `dead`
- Stores every intermediate day in timeline

## Advanced Mode (Rule-Config Scenario)

Advanced adds:

- `soilMoisture`
- `humidity`
- `temperature`
- `fertilizerLevel`
- optional `soilType`
- optional uncertainty/probability behavior

Rule source:

- `backend/src/config/v1/advancedRules.json`

Rule shape:

- `id`
- `priority`
- `probability`
- `conditions`
- `effects`
- optional `note`

Per-day logic:

1. Sort rules by priority.
2. Match controls against each rule condition.
3. Apply probability gate per matching rule.
4. Aggregate rule effects (`healthDelta`, `growthDelta`, `growthMultiplier`, `stressDelta`).
5. Apply stress penalties and clamp values.
6. Resolve state and append full advanced state (with applied rule IDs/notes).

## Uncertainty Mode

When enabled:

- Adds controlled jitter to rule effects
- Keeps randomness reproducible with optional `seed`
- Uses adjustable `intensity` to control variance

Use cases:

- Test robustness under non-deterministic behavior
- Compare deterministic vs probabilistic scenarios

## Storage Model

Current storage is in-memory:

- Base simulation store: `backend/src/utils/v1/simulationStore.ts`
- Advanced simulation store: `backend/src/utils/v1/advancedSimulationStore.ts`

This is fast for demos and local testing, but not persistent across restarts.

## 2) How to Extend the System

## Add a New Input Variable

Example: add `pHLevel` or `wind`.

1. Add type fields in `backend/src/utils/v1/advancedTypes.ts`.
2. Extend input normalization in `backend/src/controller/simulationAdvanced/index.ts`.
3. Update rule condition interface and config values in `advancedRules.json`.
4. Include the variable in `controlsMatch(...)` and baseline calculations if needed.
5. Expose control in frontend advanced page and API payload types.

## Add a New Rule

1. Add a new rule object to `backend/src/config/v1/advancedRules.json`.
2. Define `conditions`, `effects`, `priority`, and optional `probability`.
3. Validate in UI by running a scenario that triggers this condition.
4. Confirm applied rule IDs/notes appear in response timeline.

## Move Rules from JSON to DB

Recommended production path:

1. Create `rules` table/collection with versioning.
2. Load active rule set at boot or via cached repository layer.
3. Add admin-safe update flow with schema validation.
4. Keep a fallback static rule set for resilience.

## Add Persistence for Simulation Runs

1. Replace in-memory stores with DB-backed repositories.
2. Save scenario metadata + timeline states.
3. Add user ownership, pagination, and retention policy.

## 3) Current Limitations and Improvements

## Current Limitations

- In-memory state only (data lost on server restart)
- Single generic plant profile by default
- No auth / user separation
- No formal test suite included yet
- Rule config still local JSON (not DB managed yet)

## Improvements with More Time

- Persistent storage with migration/versioning
- Rule editor UI and admin validation workflow
- Multi-plant templates with species-specific rules
- Automated tests for engine branches and regression cases
- Better analytics dashboard for scenario comparisons
- Export formats beyond CSV (JSON/PDF reports)

## Operational Quick Checks

1. Backend health: `GET /` and `GET /v1/ping`
2. Start base simulation: `POST /v1/simulation/start`
3. Run advanced scenario: `POST /v1/simulation/advanced/start` then `/run`
4. Verify docs load: `http://localhost:7008/swagger`

