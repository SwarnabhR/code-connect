import { EventEmitter } from "events";
import { WebSocket, WebSocketServer } from "ws";
import { BridgeMessage } from "@code-connect/shared";

// Emits "problem" (ProblemPayload) and "message" (BridgeMessage) events.
export class Bridge extends EventEmitter {
  private wss: WebSocketServer;
  private client: WebSocket | undefined;

  constructor(port: number) {
    super();
    this.wss = new WebSocketServer({ port, host: "127.0.0.1" });
    this.wss.on("connection", (socket) => {
      this.client = socket;
      socket.on("message", (raw) => this.handleRaw(raw.toString()));
      socket.on("close", () => {
        if (this.client === socket) {
          this.client = undefined;
        }
      });
    });
  }

  private handleRaw(raw: string) {
    let message: BridgeMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === "problem:fetched") {
      this.emit("problem", message.payload);
    } else if (message.type === "ping") {
      this.client?.send(JSON.stringify({ type: "pong" }));
      return;
    }
    this.emit("message", message);
  }

  get isConnected(): boolean {
    return this.client !== undefined && this.client.readyState === WebSocket.OPEN;
  }

  send(message: BridgeMessage): boolean {
    if (!this.isConnected || !this.client) {
      return false;
    }
    this.client.send(JSON.stringify(message));
    return true;
  }

  dispose() {
    this.client?.close();
    this.wss.close();
  }
}
