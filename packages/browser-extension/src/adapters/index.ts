import { PlatformAdapter } from "./types";
import { codeforcesAdapter } from "./codeforces";

const adapters: PlatformAdapter[] = [codeforcesAdapter];

export function getAdapterFor(url: string): PlatformAdapter | undefined {
  return adapters.find((adapter) => adapter.matches(url));
}
