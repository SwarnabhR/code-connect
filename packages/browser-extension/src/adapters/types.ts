import { Platform, ProblemPayload, Verdict } from "@code-connect/shared";

export interface VerdictUpdate {
  submissionId?: string;
  verdict: Verdict;
  passedTestCount?: number;
  message?: string;
}

export interface PlatformAdapter {
  id: Platform;
  matches(url: string): boolean;
  parseProblem(doc: Document): ProblemPayload;
  submit(
    doc: Document,
    code: string,
    languageId: string
  ): Promise<{ submissionId?: string }>;
  pollVerdict(ctx: {
    submissionId?: string;
    doc: Document;
  }): Promise<VerdictUpdate>;
}
