import * as dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });

type EnvName = "DEV" | "STAGE" | "PROD";

interface AppConfig {
  PORT: number;
  SWAGGER_URLS: string;
  CORS_URLS: string;
  ENVIRONMENT: EnvName;
}

type ConfigFile = Record<string, Record<string, string | number>>;

const configFilePath = resolve(process.cwd(), "config.json");
let configFileJSON: ConfigFile = {};

if (existsSync(configFilePath)) {
  const configFileData = readFileSync(configFilePath, "utf8");
  configFileJSON = JSON.parse(configFileData) as ConfigFile;
}

const environment = ((process.env.ENVIRONMENT || "DEV").toUpperCase() as EnvName) || "DEV";
const environmentConfig = configFileJSON[environment] || {};

function getConfigVariable(key: string, mandatory = true, fallback?: string): string {
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== "") {
    return envValue;
  }

  const fileValue = environmentConfig[key];
  if (fileValue !== undefined && fileValue !== null && String(fileValue) !== "") {
    return String(fileValue);
  }

  if (fallback !== undefined) {
    return fallback;
  }

  if (mandatory) {
    throw new Error(`Missing config value: ${key} for environment ${environment}`);
  }

  return "";
}

export const config: AppConfig = {
  PORT: Number(getConfigVariable("PORT", true, "7008")),
  SWAGGER_URLS: getConfigVariable("SWAGGER_URLS", false, "http://localhost:7008"),
  CORS_URLS: getConfigVariable("CORS_URLS", false, "http://localhost:3000,http://localhost:5173"),
  ENVIRONMENT: environment,
};
