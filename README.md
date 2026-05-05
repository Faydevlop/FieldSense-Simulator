# FieldSense Simulation Engine

FieldSense is a full-stack interactive plant simulation platform built for the Clinica One / Revin Krishi full-stack assessment.

It moves from static calculator-style outputs to time-step simulation with backend-owned logic, state evolution, and a UI for repeated experimentation.

## Assessment Goals Coverage

This implementation addresses the main PDF mandates:

- Backend-driven simulation logic (no hardcoded rules in UI)
- Clear frontend and backend separation
- Time-step progression (Day 1 -> Day N) with stored intermediate states
- Interactive UI controls and visual progression
- Extensible architecture with an advanced rule-config mode

## Architecture Overview

```text
Frontend (React + Vite)
  |
  | HTTP JSON APIs
  v
Backend (Express + TypeScript)
  |
  +--> Base Simulation Engine Mode (water/sunlight)
  |
  +--> Advanced Simulation Engine Mode (isAdvanced=true)
         + rule config from JSON
         + optional uncertainty/probability
         + scenario lab operations (list/compare/export)
```

Core engine entrypoints are in `backend/src/services/simulationEngine.ts` and support both standard and advanced modes.

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router
- Backend: Node.js, Express, TypeScript
- Docs/API: Swagger bundle served from backend public assets

## Project Structure

```text
FieldSense/
  backend/
    src/
      controller/
      routes/
      services/
      utils/
      config/
  frontend/
    src/
      api/
      components/
      pages/
      types/
      utils/
```

## Local Setup

## 1) Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (or compatible npm that ships with Node 20+)

## 2) Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Default backend env values from `backend/.env.example`:

- `PORT=7008`
- `ENVIRONMENT=DEV`
- `SWAGGER_URLS=http://localhost:7008`
- `CORS_URLS=http://localhost:3000,http://localhost:5173,http://localhost:7008,http://127.0.0.1:7008`

## 3) Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Default frontend env values from `frontend/.env.example`:

- `VITE_API_BASE_URL=http://localhost:7008/v1`

## 4) Run URLs

- Frontend app: `http://localhost:5173`
- Backend service: `http://localhost:7008`
- Swagger docs: `http://localhost:7008/swagger`

## Build and Typecheck

Backend:

```bash
cd backend
npm run typecheck
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## API Surface

## Base Simulation APIs

- `POST /v1/simulation/start`
- `POST /v1/simulation/run`
- `GET /v1/simulation/:id`
- `POST /v1/simulation/reset`

## Advanced Simulation APIs

- `GET /v1/simulation/advanced`
- `GET /v1/simulation/advanced/compare?ids=<id1,id2,...>`
- `POST /v1/simulation/advanced/start`
- `POST /v1/simulation/advanced/run`
- `POST /v1/simulation/advanced/reset`
- `GET /v1/simulation/advanced/:id`
- `GET /v1/simulation/advanced/:id/export`

## UI Routes

- `/` Home
- `/simulate` Base simulation
- `/simulate/advanced` Advanced simulation lab

## Runbook

Detailed simulation behavior, extensibility steps, and known limitations are documented in:

- [readbook.md](./readbook.md)

## Deliverables Checklist (From PDF)

- Codebase: Done
- Simulation engine: Done
- Interactive UI: Done
- Visual architecture diagram: To add
- Runbook: Added (`readbook.md`)
- Demo video: To add
- Slides: To add

Suggested placeholders you can later fill:

- `docs/architecture-diagram.png`
- `docs/demo-video-link.md`
- `docs/presentation-link.md`
