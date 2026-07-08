import type { SearchParams, SourceResult } from "@/lib/types";
import { search as greenhouse } from "./greenhouse";
import { search as lever } from "./lever";
import { search as remoteok } from "./remoteok";
import { search as weworkremotely } from "./weworkremotely";
import { search as jsearch } from "./jsearch";

export type SourceId =
  | "greenhouse"
  | "lever"
  | "remoteok"
  | "weworkremotely"
  | "jsearch";

type Adapter = (params: SearchParams) => Promise<SourceResult>;

export const SOURCES: Record<SourceId, Adapter> = {
  greenhouse,
  lever,
  remoteok,
  weworkremotely,
  jsearch,
};

export const ALL_SOURCE_IDS = Object.keys(SOURCES) as SourceId[];

/**
 * Run the requested source adapters in parallel and return their results.
 * Adapters never throw; failures are reported via `result.error`.
 */
export async function searchAllSources(
  params: SearchParams,
  sources: SourceId[] = ALL_SOURCE_IDS,
): Promise<SourceResult[]> {
  return Promise.all(sources.map((id) => SOURCES[id](params)));
}
