import type { RunMode } from './config.js';

export interface CliArgs {
  mode?: RunMode;
  port?: number;
  logLevel?: string;
  help?: boolean;
}

const ALLOWED_MODES: RunMode[] = ['full', 'lite', 'minimal'];

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];

    switch (flag) {
      case '--mode':
        if (!next || !ALLOWED_MODES.includes(next as RunMode)) {
          throw new Error(`Invalid mode: ${next}. Allowed: ${ALLOWED_MODES.join(', ')}`);
        }
        args.mode = next as RunMode;
        i++;
        break;
      case '--port':
        if (!next || isNaN(Number(next))) {
          throw new Error(`Invalid port: ${next}`);
        }
        args.port = Number(next);
        i++;
        break;
      case '--log-level':
        if (!next) throw new Error('Missing value for --log-level');
        args.logLevel = next;
        i++;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

export function printHelp(): void {
  console.log(`godot-mcp [options]

Options:
  --mode <full|lite|minimal>  Run mode (default: full)
  --port <number>             WebSocket port for Godot (default: 6505)
  --log-level <level>         Log level: debug, info, warn, error (default: info)
  --help, -h                  Show this help
`);
}
