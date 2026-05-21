import { readFileSync } from 'fs';
import { resolve } from 'path';

export type RunMode = 'full' | 'lite' | 'minimal';

export interface Config {
  port: number;
  mode: RunMode;
  project_path: string;
  log_level: string;
}

const DEFAULTS: Config = {
  port: 6505,
  mode: 'full',
  project_path: './',
  log_level: 'info',
};

const ALLOWED_MODES: RunMode[] = ['full', 'lite', 'minimal'];

export function loadConfig(path: string): Config {
  let fileConfig: Partial<Config> = {};

  try {
    const raw = readFileSync(resolve(path), 'utf-8');
    fileConfig = JSON.parse(raw) as Partial<Config>;
  } catch {
    // File missing or unreadable — use defaults
  }

  const mode = envOrFile('GODOT_MCP_MODE', fileConfig.mode, DEFAULTS.mode);
  const validatedMode = ALLOWED_MODES.includes(mode as RunMode) ? (mode as RunMode) : DEFAULTS.mode;

  return {
    port: parseInt(envOrFile('GODOT_MCP_PORT', fileConfig.port, DEFAULTS.port).toString(), 10),
    mode: validatedMode,
    project_path: envOrFile('GODOT_MCP_PROJECT_PATH', fileConfig.project_path, DEFAULTS.project_path),
    log_level: envOrFile('GODOT_MCP_LOG_LEVEL', fileConfig.log_level, DEFAULTS.log_level),
  };
}

function envOrFile(envKey: string, fileValue: string | number | undefined, defaultValue: string | number): string | number {
  const env = process.env[envKey];
  if (env !== undefined) return env;
  if (fileValue !== undefined) return fileValue;
  return defaultValue;
}
