import * as vscode from "vscode";
import { Bridge } from "./bridge/server";
import { setCurrentProblem, getCurrentProblem } from "./state/currentProblem";
import { showProblem } from "./webview/problemPanel";
import { registerSubmitCommand } from "./commands/submitCurrentFile";

export function activate(context: vscode.ExtensionContext) {
  const port = vscode.workspace
    .getConfiguration("codeConnect")
    .get<number>("bridgePort", 4321);
  const bridge = new Bridge(port);
  context.subscriptions.push({ dispose: () => bridge.dispose() });

  bridge.on("problem", (payload) => {
    setCurrentProblem(payload);
    showProblem(payload, () =>
      vscode.commands.executeCommand("code-connect.submit")
    );
  });

  registerSubmitCommand(context, bridge);

  context.subscriptions.push(
    vscode.commands.registerCommand("code-connect.showProblem", () => {
      const problem = getCurrentProblem();
      if (!problem) {
        vscode.window.showInformationMessage(
          "Code Connect: no problem loaded yet."
        );
        return;
      }
      showProblem(problem, () =>
        vscode.commands.executeCommand("code-connect.submit")
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("code-connect.helloWorld", () => {
      vscode.window.showInformationMessage("Hello World from code-connect!");
    })
  );
}

export function deactivate() {}
