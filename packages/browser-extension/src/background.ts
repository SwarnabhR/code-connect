import { BridgeMessage } from "@code-connect/shared";
import { ToBackground, FromBackground } from "./internalMessages";

const BRIDGE_PORT = 4321;
const HEARTBEAT_INTERVAL_MS = 20_000;
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 10_000;

let socket: WebSocket | undefined;
let reconnectDelay = RECONNECT_MIN_MS;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let problemTabId: number | undefined;

function connect() {
  socket = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}`);

  socket.addEventListener("open", () => {
    reconnectDelay = RECONNECT_MIN_MS;
    broadcastStatus(true);
    socket?.send(JSON.stringify({ type: "hello", from: "browser-extension", version: "0.0.1" }));
    heartbeatTimer = setInterval(() => {
      socket?.send(JSON.stringify({ type: "ping" }));
    }, HEARTBEAT_INTERVAL_MS);
  });

  socket.addEventListener("message", (event) => {
    let message: BridgeMessage;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "pong") {
      return;
    }
    if ("requestId" in message && problemTabId !== undefined) {
      chrome.tabs.sendMessage(problemTabId, {
        type: "fromBridge",
        message,
      } satisfies FromBackground);
    }
  });

  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", () => socket?.close());
}

function scheduleReconnect() {
  broadcastStatus(false);
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
  setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
}

function broadcastStatus(connected: boolean) {
  chrome.runtime
    .sendMessage({ type: "bridgeStatus", connected } satisfies FromBackground)
    .catch(() => {
      // No listener (e.g. no popup open) -- fine to ignore.
    });
}

chrome.runtime.onMessage.addListener((raw: ToBackground, sender) => {
  if (raw.type !== "toBridge") {
    return;
  }
  if (raw.message.type === "problem:fetched" && sender.tab?.id !== undefined) {
    problemTabId = sender.tab.id;
  }
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(raw.message));
  }
});

connect();
