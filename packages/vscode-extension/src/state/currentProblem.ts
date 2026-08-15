import { ProblemPayload } from "@code-connect/shared";

let current: ProblemPayload | undefined;

export function setCurrentProblem(payload: ProblemPayload) {
  current = payload;
}

export function getCurrentProblem(): ProblemPayload | undefined {
  return current;
}
