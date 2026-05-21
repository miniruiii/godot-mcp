import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('returns defaults with no args', () => {
    const args = parseArgs([]);
    expect(args.mode).toBeUndefined();
    expect(args.port).toBeUndefined();
    expect(args.logLevel).toBeUndefined();
  });

  it('parses --mode lite', () => {
    const args = parseArgs(['--mode', 'lite']);
    expect(args.mode).toBe('lite');
  });

  it('parses --port 7000', () => {
    const args = parseArgs(['--port', '7000']);
    expect(args.port).toBe(7000);
  });

  it('parses --log-level debug', () => {
    const args = parseArgs(['--log-level', 'debug']);
    expect(args.logLevel).toBe('debug');
  });

  it('rejects invalid mode', () => {
    expect(() => parseArgs(['--mode', 'invalid'])).toThrow('Invalid mode');
  });
});
