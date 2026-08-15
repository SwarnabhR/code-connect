import { BridgeMessage } from "@code-connect/shared";

// Messages exchanged between content scripts and the background service
// worker, distinct from BridgeMessage (which travels over the WebSocket to
// the VS Code extension).
export type ToBackground = { type: "toBridge"; message: BridgeMessage };
export type FromBackground =
  | { type: "fromBridge"; message: BridgeMessage }
  | { type: "bridgeStatus"; connected: boolean };
