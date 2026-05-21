import WebSocket from 'ws';

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
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', async () => {
          this.reconnectDelay = 1000;
          try {
            const result = await this.call('handshake', {}) as { version: string; godot_version: string };
            this.godotVersion = result.godot_version;
          } catch {
            // Handshake optional for backward compat
          }
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          this.ws = null;
          this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
          if (!this.isConnected) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
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
      this.ws!.send(JSON.stringify(request));
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
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }
}