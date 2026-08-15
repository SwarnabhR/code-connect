import { ProblemPayload, Verdict } from "@code-connect/shared";
import { PlatformAdapter, VerdictUpdate } from "./types";

// Field names below are derived from third-party tooling (cf-tool), not a
// live capture. TODO: confirm exact field names/casing against a real
// Codeforces submit form in DevTools before relying on this in production
// (see plan's "Codeforces adapter specifics" section).

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function parseProblemIdFromUrl(url: string): {
  contestId?: string;
  problemIndex: string;
} {
  const contestMatch = url.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
  if (contestMatch) {
    return { contestId: contestMatch[1], problemIndex: contestMatch[2] };
  }
  const problemsetMatch = url.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
  if (problemsetMatch) {
    return { contestId: problemsetMatch[1], problemIndex: problemsetMatch[2] };
  }
  throw new Error("Could not parse Codeforces problem id from URL");
}

const VERDICT_MAP: Record<string, Verdict> = {
  OK: "OK",
  WRONG_ANSWER: "WRONG_ANSWER",
  TIME_LIMIT_EXCEEDED: "TIME_LIMIT_EXCEEDED",
  RUNTIME_ERROR: "RUNTIME_ERROR",
  COMPILATION_ERROR: "COMPILATION_ERROR",
  TESTING: "TESTING",
  SUBMITTED: "QUEUED",
};

export const codeforcesAdapter: PlatformAdapter = {
  id: "codeforces",

  matches(url: string): boolean {
    return /codeforces\.com\/(contest|problemset\/problem)\//.test(url);
  },

  parseProblem(doc: Document): ProblemPayload {
    const { contestId, problemIndex } = parseProblemIdFromUrl(location.href);
    const statement = doc.querySelector(".problem-statement");
    if (!statement) {
      throw new Error("Codeforces problem statement not found on page");
    }
    const title = statement.querySelector(".title")?.textContent?.trim() ?? "";
    const timeLimitText = statement
      .querySelector(".time-limit")
      ?.textContent?.replace("time limit per test", "")
      .trim();
    const memoryLimitText = statement
      .querySelector(".memory-limit")
      ?.textContent?.replace("memory limit per test", "")
      .trim();

    // Strip scripts before this ever leaves the adapter -- it ends up
    // rendered inside the VS Code webview.
    const clone = statement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script").forEach((el) => el.remove());

    return {
      platform: "codeforces",
      problemId: `${contestId}${problemIndex}`,
      contestId,
      name: title,
      statementHtml: clone.innerHTML,
      timeLimitMs: timeLimitText ? parseFloat(timeLimitText) * 1000 : undefined,
      memoryLimitMb: memoryLimitText ? parseFloat(memoryLimitText) : undefined,
      sourceUrl: location.href,
    };
  },

  async submit(doc, code, languageId) {
    const { contestId, problemIndex } = parseProblemIdFromUrl(location.href);
    const csrfToken = (
      doc.querySelector('input[name="csrf_token"]') as HTMLInputElement | null
    )?.value;
    if (!csrfToken || !contestId) {
      throw new Error(
        "Missing csrf_token or contestId -- open the problem's submit page and retry"
      );
    }

    const body = new URLSearchParams({
      csrf_token: csrfToken,
      ftaa: getCookie("ftaa") ?? "",
      bfaa: getCookie("bfaa") ?? "",
      action: "submitSolutionFormSubmitted",
      submittedProblemIndex: problemIndex,
      programTypeId: languageId,
      contestId,
      source: code,
      tabSize: "4",
      sourceCodeConfirmed: "true",
    });

    const url = `https://codeforces.com/contest/${contestId}/submit?csrf_token=${csrfToken}`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await response.text();

    if (/verification|challenge/i.test(text) && !/submitted successfully/i.test(text)) {
      throw new Error(
        "Codeforces is showing a verification challenge -- please complete it in your browser tab, then retry"
      );
    }
    if (!/submitted successfully/i.test(text)) {
      throw new Error("Codeforces did not confirm the submission");
    }

    return {};
  },

  async pollVerdict({ doc }): Promise<VerdictUpdate> {
    const handle = doc
      .querySelector('a[href^="/profile/"]')
      ?.textContent?.trim();
    if (!handle) {
      throw new Error("Could not determine logged-in Codeforces handle");
    }
    const response = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(
        handle
      )}&from=1&count=1`
    );
    const data = await response.json();
    if (data.status !== "OK" || !data.result?.length) {
      throw new Error("Could not read submission status from Codeforces API");
    }
    const submission = data.result[0];
    const verdict = VERDICT_MAP[submission.verdict ?? "TESTING"] ?? "OTHER";
    return {
      submissionId: String(submission.id),
      verdict,
      passedTestCount: submission.passedTestCount,
    };
  },
};
