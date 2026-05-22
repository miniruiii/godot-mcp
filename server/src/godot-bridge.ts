import WebSocket from 'ws';
import { setLogBridge } from './tools/log.js';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GodotBridge {
  private ws: WebSocket | null = null;
  private pending = new Map<number, PendingRequest>();
  private requestId = 0;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private version = '1.0.0';
  private godotVersion: string | null = null;
  private connectingPromise: Promise<void> | null = null;

  constructor(port: number = 6505) {
    this.url = `ws://127.0.0.1:${port}`;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getUrl(): string {
    return this.url;
  }

  getVersion(): string {
    return this.version;
  }

  getGodotVersion(): string | null {
    return this.godotVersion;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.url);
        this.ws = ws;

        ws.on('open', async () => {
          this.reconnectDelay = 1000;
          try {
            const result = await this.call('handshake', {}) as { version: string; godot_version: string };
            this.godotVersion = result.godot_version;
            setLogBridge(this);
          } catch {
            // Handshake optional for backward compat
          }
          resolve();
        });

        ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        ws.on('close', () => {
          if (this.ws === ws) {
            this.ws = null;
            this.scheduleReconnect();
          }
        });

        ws.on('error', (err) => {
          if (!this.isConnected) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    // Null out ws BEFORE terminate() to prevent close handler from scheduling reconnect
    const ws = this.ws;
    this.ws = null;
    this.connectingPromise = null;
    if (ws) {
      ws.terminate();
    }
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
    }
    this.pending.clear();
  }

  async call(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error('Godot editor not connected. Please start Godot and enable the Godot MCP plugin.');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      try {
        this.ws!.send(JSON.stringify(request));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error(`Failed to send request: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  }

  async callOnline(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error('Godot editor not connected. Please start Godot and enable the Godot MCP plugin.');
    }
    return this.call(method, params);
  }

  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data);
      if (msg.jsonrpc !== '2.0') return;

      if (msg.method === 'ping') {
        this.ws?.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: 'pong' }));
        return;
      }

      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id)!;
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);

        if (msg.error) {
          pending.reject(new Error(msg.error.message || 'Unknown error'));
        } else {
          pending.resolve(msg.result);
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.connectingPromise) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }
}