import { EnvConfig, validateEnvConfig } from "../types/configuration-types";
import dotenv from "dotenv";
dotenv.config();

export const env = { ...process.env } as unknown as EnvConfig;

const valid = validateEnvConfig(env);
if (!valid) {
  throw new Error("Invalid env configuration: " + JSON.stringify(validateEnvConfig.errors, null, 2));
}
