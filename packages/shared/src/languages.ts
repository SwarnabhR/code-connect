import { Platform } from "./protocol";

// Codeforces programTypeId values pulled from the <select name="programTypeId">
// options on a real submit page. TODO: reverify against the live page during
// the Codeforces adapter spike (see plan) -- these IDs are known to drift.
export const CODEFORCES_LANGUAGE_IDS: Record<string, string> = {
  cpp: "54", // GNU G++17 7.3.0
  python: "31", // Python 3.8.10
  java: "36", // Java 8
  csharp: "79", // C# 8, .NET Core 3.1
  rust: "75", // Rust 2021
  go: "32", // Go
};

export function languageIdFor(
  platform: Platform,
  vscodeLanguageId: string
): string | undefined {
  switch (platform) {
    case "codeforces":
      return CODEFORCES_LANGUAGE_IDS[vscodeLanguageId];
    default:
      return undefined;
  }
}
