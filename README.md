# Code Connect

Bridges competitive programming judges to your code editor. Open a problem in your
browser, read the statement side-by-side in VS Code, write your solution, and submit
it without leaving your editor — with live verdict updates streamed back.

**Status: early development (Phase 1).** Currently supports [Codeforces](https://codeforces.com)
for problem fetching, submission, and verdict polling. Other platforms are planned.

## Features

- **One-click problem import** — a "Send to Code Connect" button is injected on
  supported judge pages; clicking it parses the problem and pushes it to VS Code.
- **Side-by-side problem panel** — the statement renders in a VS Code webview next
  to your editor, with limits, source link, and a submit button.
- **Submit from your editor** — maps your current file's language to the judge's
  language ID and submits the active editor's contents.
- **Live verdict updates** — the status bar and problem panel stream submission
  status (Queued / Testing / Accepted / Wrong Answer / TLE / RTE / CE) as the
  browser polls the judge.
- **Extensible platform adapters** — new judges can be added by implementing the
  `PlatformAdapter` interface (see [`types.ts`](packages/browser-extension/src/adapters/types.ts)).

## How it works

```
┌────────────────────────────┐        ┌──────────────────────────────────┐
│  Browser extension (MV3)   │        │       VS Code extension          │
│                            │  WS    │                                  │
│  Content script  ──►  bg   │ ◄────► │  Bridge (127.0.0.1:4321)         │
│  (parse + submit + poll)   │ bridge │   │                              │
│  Adapters: codeforces      │        │   ├─ Problem webview panel       │
└────────────────────────────┘        │   └─ Status bar + submit command │
                                      └──────────────────────────────────┘
```

1. You open a supported problem page (e.g. `codeforces.com/contest/1234/problem/A`).
2. The content script matches the URL, selects the right **adapter**, and injects
   the **"Send to Code Connect"** button.
3. On click, the adapter parses the problem statement into a `ProblemPayload` and
   forwards it to the background service worker, which sends it over a local
   **WebSocket bridge** (`ws://127.0.0.1:<bridgePort>`, default `4321`) to the
   VS Code extension.
4. The extension opens a webview panel with the statement and remembers it as the
   current problem.
5. **Code Connect: Submit Current File** sends the active editor buffer + mapped
   language ID back over the bridge.
6. The browser content script posts the submission to the judge using your logged-in
   session, then polls for a verdict and streams status messages back to the editor.

All messaging uses the typed `BridgeMessage` protocol shared between both ends —
see [`protocol.ts`](packages/shared/src/protocol.ts).

## Repository structure

This is an [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
monorepo:

```
code-connect/
├── packages/
│   ├── shared/             # @code-connect/shared
│   │   ├── protocol.ts     #   BridgeMessage + ProblemPayload types
│   │   └── languages.ts    #   judge language ID mappings
│   ├── browser-extension/  # @code-connect/browser-extension
│   │   ├── manifest.json   #   MV3 manifest (permissions, content scripts)
│   │   └── src/
│   │       ├── background.ts      #   WS bridge client + reconnect/heartbeat
│   │       ├── content.ts         #   injected button + submit/poll flow
│   │       ├── internalMessages.ts #   content ↔ background message types
│   │       └── adapters/          #   per-platform PlatformAdapter impls
│   └── vscode-extension/   # code-connect (VS Code extension)
│       └── src/
│           ├── extension.ts              #   activation + command registration
│           ├── bridge/server.ts          #   local WebSocketServer (the bridge)
│           ├── commands/submitCurrentFile.ts
│           ├── state/currentProblem.ts
│           └── webview/problemPanel.ts
└── package.json            # workspace root + postinstall build hook
```

### Packages

| Package                      | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `@code-connect/shared`       | Shared TypeScript types, the bridge protocol, and language maps.   |
| `@code-connect/browser-extension` | Chrome (Manifest V3) extension: parses problems, submits, polls. |
| `code-connect` (VS Code)     | VS Code extension: bridge server, problem webview, submit command. |

## Getting started

### Prerequisites

- **Node.js** 18+ (npm workspaces, modern WebSocket APIs)
- **VS Code** 1.90+
- **Chrome** (or Chromium-based browser) for the extension

### Install and build

```bash
npm install        # installs workspaces and builds @code-connect/shared
```

The root `postinstall` script builds the shared package automatically so the other
two workspaces can import its `dist/` output. If you change `shared/src/` during
development, rebuild it with:

```bash
npm run build -w @code-connect/shared
```

### Load the extensions

**VS Code extension**

1. Open the repo in VS Code.
2. Press `F5` from `packages/vscode-extension/` (or run the *Run Extension* debug
   configuration) to launch an Extension Development Host.
3. The bridge starts on `127.0.0.1:4321` (configurable via the
   `codeConnect.bridgePort` setting).

**Browser extension**

1. `npm run build -w @code-connect/browser-extension` produces `dist/`.
2. Open `chrome://extensions`, enable **Developer mode**, and choose
   **Load unpacked** → `packages/browser-extension/dist/`.
3. Make sure you're logged in to Codeforces in that browser — submissions use your
   session (cookies are read by the content script).

### Usage

1. Open a Codeforces problem page, e.g.
   `https://codeforces.com/contest/1978/problem/A`.
2. Click **Send to Code Connect** (top-right corner of the page).
3. The problem opens in the VS Code webview panel.
4. Write your solution in a file whose language is mapped for the platform
   (e.g. C++ → GNU G++17, Python → Python 3).
5. Run **Code Connect: Submit Current File** from the Command Palette, or click
   **Submit current file** in the panel.
6. Watch the status bar / panel for the verdict.

### Common scripts

```bash
# Shared package
npm run build -w @code-connect/shared
npm run watch -w @code-connect/shared

# Browser extension
npm run build -w @code-connect/browser-extension   # production bundle
npm run watch -w @code-connect/browser-extension   # dev + rebuild on change
npm run lint -w @code-connect/browser-extension

# VS Code extension
npm run compile -w vscode-extension   # webpack build into dist/
npm run lint -w vscode-extension
npm test -w vscode-extension          # VS Code integration tests (see below)
```

## Testing

The VS Code extension uses [`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli)
with tests in `packages/vscode-extension/src/test/`. The `pretest` script compiles
the test sources, bundles the extension, and runs ESLint before launching the test
runner:

```bash
npm test -w vscode-extension
```

## Contributing

Contributions are welcome! Please follow the rules below so reviews stay fast and
the repo stays consistent.

### Contribution rules

1. **Open an issue first.** For anything beyond a trivial typo fix, file an issue
   describing the problem or feature before opening a PR so we can agree on the
   approach.
2. **Branch from `main`.** Create a short, descriptive branch name, e.g.
   `feat/leetcode-adapter`, `fix/bridge-reconnect`.
3. **Keep PRs small and focused.** One logical change per PR. Split large features
   into multiple PRs.
4. **Respect the monorepo layout.** New code belongs in the right package:
   judge-agnostic types/protocol → `shared`; judge-specific logic → a `PlatformAdapter`
   in `browser-extension/src/adapters`; editor integration → `vscode-extension`.
5. **Follow existing conventions.** Match the surrounding style: typed
   `BridgeMessage`s for all cross-process communication, explicit
   `PlatformAdapter` implementations, no untyped `any` where avoidable, and no
   secrets or credentials anywhere in code.
6. **Add or update tests.** New behavior in the VS Code extension should ship with
   integration tests (`npm test -w vscode-extension`). Platform-adapter behavior
   that requires a live judge session should be documented as such, since it can't
   run in CI.
7. **Build, lint, and test before pushing:**
   ```bash
   npm run build -w @code-connect/shared
   npm run build -w @code-connect/browser-extension
   npm run lint -w @code-connect/browser-extension
   npm run lint -w vscode-extension
   npm test -w vscode-extension
   ```
8. **Commit style.** Use the conventional-commit style already in the history
   (`feat:`, `fix:`, `refactor:`, `docs:`, …). Reference the issue number in the
   PR description.
9. **Don't force-push or rebase shared branches.** Prefer adding commits over
   rewriting history once a PR has review comments.
10. **Wait for CI.** Keep the PR green; address all review comments and re-request
    review when done.

### Adding a new platform (CodeChef, LeetCode, GeeksforGeeks, …)

1. Create `packages/browser-extension/src/adapters/<platform>.ts` implementing
   `PlatformAdapter` (see `types.ts`): `matches`, `parseProblem`, `submit`,
   `pollVerdict`.
2. Register it in `adapters/index.ts`.
3. Add the platform to the `Platform` union in `packages/shared/src/protocol.ts`
   and any language mappings in `languages.ts`.
4. Extend the `manifest.json` `content_scripts.matches` / `host_permissions` for
   the new domain.

## Roadmap

- [ ] LeetCode / CodeChef / GeeksforGeeks adapters
- [ ] Multi-problem history and quick-pick
- [ ] Test case running against local samples
- [ ] Publishing to the VS Code Marketplace and Chrome Web Store

## License

[Apache License 2.0](LICENSE)