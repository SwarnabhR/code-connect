export type Platform = "codeforces" | "leetcode" | "codechef" | "gfg";

export type Verdict =
  | "QUEUED"
  | "TESTING"
  | "OK"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | "OTHER";

export interface ProblemPayload {
  platform: Platform;
  problemId: string;
  contestId?: string;
  name: string;
  statementHtml: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  sourceUrl: string;
}

export type BridgeMessage =
  | { type: "hello"; from: "browser-extension"; version: string }
  | { type: "ping" }
  | { type: "pong" }
  | { type: "problem:fetched"; payload: ProblemPayload }
  | {
      type: "submit:request";
      requestId: string;
      code: string;
      languageId: string;
      problemId: string;
    }
  | { type: "submit:accepted"; requestId: string; submissionId?: string }
  | {
      type: "submit:status";
      requestId: string;
      submissionId?: string;
      verdict: Verdict;
      passedTestCount?: number;
      message?: string;
    }
  | { type: "submit:error"; requestId: string; error: string };
