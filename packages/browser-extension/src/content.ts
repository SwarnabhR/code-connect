import { BridgeMessage } from "@code-connect/shared";
import { getAdapterFor } from "./adapters";
import { ToBackground, FromBackground } from "./internalMessages";

const adapter = getAdapterFor(location.href);
if (adapter) {
  injectSendButton();
}

function injectSendButton() {
  const button = document.createElement("button");
  button.textContent = "Send to Code Connect";
  button.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;padding:6px 10px;";
  button.addEventListener("click", () => {
    if (!adapter) {
      return;
    }
    try {
      const payload = adapter.parseProblem(document);
      send({ type: "problem:fetched", payload });
      button.textContent = "Sent!";
      setTimeout(() => (button.textContent = "Send to Code Connect"), 1500);
    } catch (err) {
      button.textContent = "Failed to parse problem";
      console.error("[code-connect]", err);
    }
  });
  document.body.appendChild(button);
}

function send(message: BridgeMessage) {
  chrome.runtime.sendMessage({ type: "toBridge", message } satisfies ToBackground);
}

chrome.runtime.onMessage.addListener((raw: FromBackground) => {
  if (raw.type !== "fromBridge" || !adapter) {
    return;
  }
  const message = raw.message;
  if (message.type !== "submit:request") {
    return;
  }
  handleSubmit(message.requestId, message.code, message.languageId);
});

async function handleSubmit(requestId: string, code: string, languageId: string) {
  if (!adapter) {
    return;
  }
  try {
    const { submissionId } = await adapter.submit(document, code, languageId);
    send({ type: "submit:accepted", requestId, submissionId });
    await pollUntilDone(requestId, submissionId);
  } catch (err) {
    send({
      type: "submit:error",
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function pollUntilDone(requestId: string, submissionId: string | undefined) {
  if (!adapter) {
    return;
  }
  const PENDING = new Set(["QUEUED", "TESTING"]);
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const update = await adapter.pollVerdict({ submissionId, doc: document });
    send({
      type: "submit:status",
      requestId,
      submissionId: update.submissionId ?? submissionId,
      verdict: update.verdict,
      passedTestCount: update.passedTestCount,
      message: update.message,
    });
    if (!PENDING.has(update.verdict)) {
      return;
    }
  }
}
