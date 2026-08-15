import * as vscode from "vscode";
import { ProblemPayload } from "@code-connect/shared";

let panel: vscode.WebviewPanel | undefined;

export function showProblem(payload: ProblemPayload, onSubmit: () => void) {
  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      "codeConnectProblem",
      "Code Connect",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.onDidDispose(() => {
      panel = undefined;
    });
    panel.webview.onDidReceiveMessage((message) => {
      if (message?.type === "submit") {
        onSubmit();
      }
    });
  }
  panel.title = `${payload.problemId}: ${payload.name}`;
  panel.webview.html = render(payload);
}

export function updateStatus(text: string) {
  panel?.webview.postMessage({ type: "status", text });
}

function render(payload: ProblemPayload): string {
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;
  const limits = [
    payload.timeLimitMs ? `${payload.timeLimitMs} ms` : undefined,
    payload.memoryLimitMb ? `${payload.memoryLimitMb} MB` : undefined,
  ]
    .filter(Boolean)
    .join(" / ");

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <style>
      body { font-family: var(--vscode-font-family); padding: 12px; }
      #status { margin-top: 12px; color: var(--vscode-descriptionForeground); }
      button { margin-top: 12px; }
    </style>
  </head>
  <body>
    <p><a href="${payload.sourceUrl}">${payload.sourceUrl}</a></p>
    ${limits ? `<p>${limits}</p>` : ""}
    ${payload.statementHtml}
    <button id="submitBtn">Submit current file</button>
    <div id="status"></div>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById("submitBtn").addEventListener("click", () => {
        vscode.postMessage({ type: "submit" });
      });
      window.addEventListener("message", (event) => {
        if (event.data?.type === "status") {
          document.getElementById("status").textContent = event.data.text;
        }
      });
    </script>
  </body>
</html>`;
}
