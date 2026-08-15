import * as vscode from "vscode";
import * as crypto from "crypto";
import { BridgeMessage, languageIdFor } from "@code-connect/shared";
import { Bridge } from "../bridge/server";
import { getCurrentProblem } from "../state/currentProblem";
import { updateStatus } from "../webview/problemPanel";

const PENDING_VERDICTS = new Set(["QUEUED", "TESTING"]);

export function registerSubmitCommand(
  context: vscode.ExtensionContext,
  bridge: Bridge
) {
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  context.subscriptions.push(statusBar);

  const disposable = vscode.commands.registerCommand(
    "code-connect.submit",
    () => submitCurrentFile(bridge, statusBar)
  );
  context.subscriptions.push(disposable);
}

function submitCurrentFile(bridge: Bridge, statusBar: vscode.StatusBarItem) {
  const problem = getCurrentProblem();
  if (!problem) {
    vscode.window.showErrorMessage(
      "Code Connect: no problem loaded yet. Open one from the browser extension first."
    );
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Code Connect: no active file to submit.");
    return;
  }

  const languageId = languageIdFor(problem.platform, editor.document.languageId);
  if (!languageId) {
    vscode.window.showErrorMessage(
      `Code Connect: "${editor.document.languageId}" is not mapped to a ${problem.platform} language yet.`
    );
    return;
  }

  const requestId = crypto.randomUUID();
  const code = editor.document.getText();

  const onMessage = (message: BridgeMessage) => {
    if (!("requestId" in message) || message.requestId !== requestId) {
      return;
    }
    if (message.type === "submit:accepted") {
      setStatus(statusBar, "Submitted, awaiting verdict...");
    } else if (message.type === "submit:status") {
      setStatus(statusBar, `Verdict: ${message.verdict}`);
      if (!PENDING_VERDICTS.has(message.verdict)) {
        bridge.off("message", onMessage);
      }
    } else if (message.type === "submit:error") {
      setStatus(statusBar, `Error: ${message.error}`);
      vscode.window.showErrorMessage(`Code Connect: ${message.error}`);
      bridge.off("message", onMessage);
    }
  };
  bridge.on("message", onMessage);

  const sent = bridge.send({
    type: "submit:request",
    requestId,
    code,
    languageId,
    problemId: problem.problemId,
  });

  if (!sent) {
    bridge.off("message", onMessage);
    vscode.window.showErrorMessage(
      "Code Connect: browser extension is not connected."
    );
    return;
  }

  setStatus(statusBar, "Submitting...");
}

function setStatus(statusBar: vscode.StatusBarItem, text: string) {
  statusBar.text = `Code Connect: ${text}`;
  statusBar.show();
  updateStatus(text);
}
