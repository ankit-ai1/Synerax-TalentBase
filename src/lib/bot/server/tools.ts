import type { BotMode } from "../types";
import type { ToolDef } from "./registry";
import { PUBLIC_TOOLS } from "./tools-public";
import { CANDIDATE_TOOLS } from "./tools-candidate";
import { CLIENT_TOOLS } from "./tools-client";
import { STAFF_TOOLS } from "./tools-staff";

/** Every tool, once. The allow-list per role comes ONLY from each tool's `modes`. */
export const ALL_TOOLS: ToolDef[] = [...PUBLIC_TOOLS, ...CANDIDATE_TOOLS, ...CLIENT_TOOLS, ...STAFF_TOOLS];

const byMode = new Map<BotMode, ToolDef[]>();
export function toolsFor(mode: BotMode): ToolDef[] {
  if (!byMode.has(mode)) byMode.set(mode, ALL_TOOLS.filter((t) => t.modes.includes(mode)));
  return byMode.get(mode)!;
}

/** a tool by name — only if the role may use it (otherwise undefined) */
export const allowedTool = (mode: BotMode, name: string | undefined | null) => (name ? toolsFor(mode).find((t) => t.name === name) : undefined);
