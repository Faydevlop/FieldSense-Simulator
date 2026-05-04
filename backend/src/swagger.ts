import fs from "fs";
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import { config } from "./config/v1/config";
import { packageJSON } from "./utils/v1/package";

const swaggerUrls = config.SWAGGER_URLS.split(",").map(url => url.trim()).filter(Boolean);

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: packageJSON.name,
      description: packageJSON.description || "FieldSense backend API",
      version: packageJSON.version,
    },
    servers: swaggerUrls.map(url => ({ url })),
    components: {
      schemas: {
        ConditionLevel: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        PlantType: {
          type: "object",
          required: ["id", "name", "idealWater", "idealSunlight", "growthRate", "stressThreshold"],
          properties: {
            id: { type: "string", example: "plant-1" },
            name: { type: "string", example: "Generic Plant" },
            idealWater: { $ref: "#/components/schemas/ConditionLevel" },
            idealSunlight: { $ref: "#/components/schemas/ConditionLevel" },
            growthRate: { type: "number", example: 5 },
            stressThreshold: { type: "number", example: 40 },
          },
        },
        Simulation: {
          type: "object",
          properties: {
            id: { type: "string", example: "sim-123" },
            currentDay: { type: "number", example: 3 },
            status: { type: "string", enum: ["running", "completed"], example: "running" },
            plantType: { $ref: "#/components/schemas/PlantType" },
          },
        },
        SimulationState: {
          type: "object",
          properties: {
            day: { type: "number", example: 1 },
            water: { $ref: "#/components/schemas/ConditionLevel" },
            sunlight: { $ref: "#/components/schemas/ConditionLevel" },
            growth: { type: "number", example: 10 },
            health: { type: "number", example: 100 },
            state: { type: "string", enum: ["healthy", "stressed", "dead"], example: "healthy" },
          },
        },
      },
    },
    paths: {
      "/v1/simulation/start": {
        post: {
          tags: ["Simulation"],
          summary: "Start a new plant growth simulation",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plantType", "water", "sunlight"],
                  properties: {
                    plantType: {
                      $ref: "#/components/schemas/PlantType",
                    },
                    water: {
                      $ref: "#/components/schemas/ConditionLevel",
                    },
                    sunlight: {
                      $ref: "#/components/schemas/ConditionLevel",
                    },
                  },
                },
                example: {
                  plantType: {
                    id: "plant-1",
                    name: "Generic Plant",
                    idealWater: "medium",
                    idealSunlight: "medium",
                    growthRate: 5,
                    stressThreshold: 40,
                  },
                  water: "medium",
                  sunlight: "medium",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Simulation started",
              content: {
                "application/json": {
                  example: {
                    status: 200,
                    message: "success",
                    data: {
                      simulationId: "sim-123",
                      currentDay: 1,
                      state: {
                        growth: 10,
                        health: 100,
                        state: "healthy",
                      },
                    },
                    toastMessage: "Simulation started successfully",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/simulation/run": {
        post: {
          tags: ["Simulation"],
          summary: "Run an existing simulation forward by N days",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["simulationId", "days"],
                  properties: {
                    simulationId: { type: "string", example: "sim-123" },
                    days: { type: "number", example: 2 },
                    water: { $ref: "#/components/schemas/ConditionLevel" },
                    sunlight: { $ref: "#/components/schemas/ConditionLevel" },
                  },
                },
                example: {
                  simulationId: "sim-123",
                  days: 2,
                  water: "medium",
                  sunlight: "medium",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Simulation ran successfully",
              content: {
                "application/json": {
                  example: {
                    status: 200,
                    message: "success",
                    data: {
                      simulationId: "sim-123",
                      currentDay: 3,
                      status: "running",
                      daysSimulated: 2,
                      latestState: {
                        day: 3,
                        water: "medium",
                        sunlight: "medium",
                        growth: 25,
                        health: 60,
                        state: "stressed",
                      },
                    },
                    toastMessage: "Simulation ran successfully",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/simulation/{id}": {
        get: {
          tags: ["Simulation"],
          summary: "Get a simulation and its timeline",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Simulation fetched successfully",
              content: {
                "application/json": {
                  example: {
                    status: 200,
                    message: "success",
                    data: {
                      simulation: {
                        id: "sim-123",
                        currentDay: 3,
                        status: "running",
                      },
                      timeline: [
                        { day: 1, growth: 10, health: 100, state: "healthy" },
                        { day: 2, growth: 20, health: 90, state: "healthy" },
                        { day: 3, growth: 25, health: 60, state: "stressed" },
                      ],
                    },
                    toastMessage: "Simulation fetched successfully",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/simulation/reset": {
        post: {
          tags: ["Simulation"],
          summary: "Reset (delete) a simulation from in-memory store",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["simulationId"],
                  properties: {
                    simulationId: { type: "string", example: "sim-123" },
                  },
                },
                example: {
                  simulationId: "sim-123",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Simulation reset successfully",
              content: {
                "application/json": {
                  example: {
                    status: 200,
                    message: "success",
                    data: {
                      simulationId: "sim-123",
                    },
                    toastMessage: "Simulation reset successfully",
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [],
  },
  apis: [path.join(process.cwd(), "src/routes/v1/**/*.ts"), path.join(process.cwd(), "dist/routes/v1/**/*.js")],
};

export function generateSwaggerBundle(): void {
  const swaggerSpec = swaggerJSDoc(options);
  const outputDir = path.join(process.cwd(), "public", "swagger");
  const filePath = path.join(outputDir, "main.js");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    filePath,
    `(async () => {
  const docs = document.getElementById('docs');
  const apiDescriptionDocument = ${JSON.stringify(swaggerSpec)};
  docs.apiDescriptionDocument = apiDescriptionDocument;
})();`,
    "utf8",
  );
}
