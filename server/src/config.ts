import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export type RunMode = 'full' | 'lite' | 'minimal';

export interface Config {
  port: number;
  mode: RunMode;
  project_path: string;
  log_level: string;
  log_max_param_length: number;
}

const DEFAULTS: Config = {
  port: 6505,
  mode: 'full',
  project_path: './',
  log_level: 'info',
  log_max_param_length: 0,
};

const ALLOWED_MODES: RunMode[] = ['full', 'lite', 'minimal'];
const ALLOWED_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

export function loadConfig(path: string): Config {
  let fileConfig: Partial<Config> = {};

  try {
    const raw = readFileSync(resolve(path), 'utf-8');
    fileConfig = JSON.parse(raw) as Partial<Config>;
  } catch (err) {
    if (existsSync(resolve(path))) {
      console.warn(`[godot-mcp] Warning: Failed to parse config file ${path}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const rawPort = envOrFile('GODOT_MCP_PORT', fileConfig.port, DEFAULTS.port);
  let port = parseInt(rawPort.toString(), 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    port = DEFAULTS.port;
  }

  const mode = envOrFile('GODOT_MCP_MODE', fileConfig.mode, DEFAULTS.mode);
  const validatedMode = ALLOWED_MODES.includes(mode as RunMode) ? (mode as RunMode) : DEFAULTS.mode;

  const log_level = envOrFile('GODOT_MCP_LOG_LEVEL', fileConfig.log_level, DEFAULTS.log_level);
  const validatedLogLevel = ALLOWED_LOG_LEVELS.includes(log_level as string) ? (log_level as string) : DEFAULTS.log_level;

  const rawMaxLen = envOrFile('GODOT_MCP_LOG_MAX_PARAM_LENGTH', fileConfig.log_max_param_length, DEFAULTS.log_max_param_length);
  let log_max_param_length = parseInt(rawMaxLen.toString(), 10);
  if (isNaN(log_max_param_length) || log_max_param_length < 0) {
    log_max_param_length = DEFAULTS.log_max_param_length;
  }

  return {
    port,
    mode: validatedMode,
    project_path: String(envOrFile('GODOT_MCP_PROJECT_PATH', fileConfig.project_path, DEFAULTS.project_path)),
    log_level: validatedLogLevel,
    log_max_param_length,
  };
}

function envOrFile(envKey: string, fileValue: string | number | undefined, defaultValue: string | number): string | number {
  const env = process.env[envKey];
  if (env !== undefined) return env;
  if (fileValue !== undefined) return fileValue;
  return defaultValue;
}
