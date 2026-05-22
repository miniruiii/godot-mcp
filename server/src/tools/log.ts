import type { GodotBridge } from '../godot-bridge.js';

let bridgeRef: GodotBridge | null = null;

export function setLogBridge(bridge: GodotBridge): void {
  bridgeRef = bridge;
}

export async function mcpLog(message: string, level = 'debug'): Promise<void> {
  const line = `[MCP] ${message}`;
  console.log(line);
  if (bridgeRef?.isConnected) {
    try {
      await bridgeRef.call('log.print', { message, level });
    } catch {
      // Ignore log delivery failures
    }
  }
}

export function formatArgs(args: Record<string, unknown>, maxLength = 0): string {
  try {
    let json = JSON.stringify(args);
    if (maxLength > 0 && json.length > maxLength) {
      json = json.slice(0, maxLength) + `...(truncated ${json.length - maxLength} chars)`;
    }
    return json;
  } catch {
    return '[unserializable args]';
  }
}
