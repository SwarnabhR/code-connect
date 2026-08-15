import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "code-connect.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from code-connect!");
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
