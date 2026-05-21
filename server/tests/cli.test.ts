import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, printHelp } from '../src/cli.js';

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

  it('parses -h short flag', () => {
    const args = parseArgs(['-h']);
    expect(args.help).toBe(true);
  });

  it('parses combined flags', () => {
    const args = parseArgs(['--mode', 'lite', '--port', '7000']);
    expect(args.mode).toBe('lite');
    expect(args.port).toBe(7000);
  });

  it('rejects invalid mode', () => {
    expect(() => parseArgs(['--mode', 'invalid'])).toThrow('Invalid mode');
  });

  it('rejects missing --mode value', () => {
    expect(() => parseArgs(['--mode'])).toThrow('Missing value for --mode');
  });

  it('rejects missing --port value', () => {
    expect(() => parseArgs(['--port'])).toThrow('Missing value for --port');
  });

  it('rejects invalid port (non-numeric)', () => {
    expect(() => parseArgs(['--port', 'abc'])).toThrow('Invalid port');
  });

  it('rejects out-of-range port (too high)', () => {
    expect(() => parseArgs(['--port', '99999'])).toThrow('Invalid port');
  });

  it('rejects out-of-range port (zero)', () => {
    expect(() => parseArgs(['--port', '0'])).toThrow('Invalid port');
  });

  it('rejects non-integer port', () => {
    expect(() => parseArgs(['--port', '3.14'])).toThrow('Invalid port');
  });

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--foo'])).toThrow('Unknown flag');
  });
});

describe('printHelp', () => {
  it('prints help text', () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    printHelp();
    console.log = originalLog;
    const output = logs.join('\n');
    expect(output).toContain('--mode');
    expect(output).toContain('--port');
    expect(output).toContain('--log-level');
    expect(output).toContain('--help');
  });
});
