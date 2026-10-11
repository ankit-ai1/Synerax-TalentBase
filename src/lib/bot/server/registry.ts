import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { BotFaq, BotMode, BotTurn } from "../types";
import type { Entities } from "./entities";

/**
 * Every tool the assistant can use. The model only ever sees name + description + parameter schema
 * of the tools allowed for the current role. Tools run on OUR server with the user's own Supabase
 * session (RLS applies). Their results are rendered by our templates and never sent to the model.
 */
export type BotCtx = {
  mode: BotMode;
  /** the signed-in user's own session (anon session for visitors) — never the service role */
  sb: SupabaseClient;
  userId: string | null;
  firstName?: string;
  faqs: BotFaq[];
  /** run after the response (emails/notifications) */
  defer: (fn: () => unknown) => void;
};

export type Prepared<P> =
  /** need more info / nothing to confirm → just show these turns */
  | { turns: BotTurn[] }
  /** ready: show a confirmation card; only the token click executes with these (resolved) params */
  | { confirm: { title: string; details: string[]; confirmLabel: string }; params: P };

export type ToolDef<P extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  modes: BotMode[];
  /** one line for the model */
  description: string;
  params: z.ZodType<P>;
  /** fallback understanding: example phrasings (8–15, incl. Hinglish) */
  examples: string[];
  /** strong keyword signals for the fallback engine */
  keywords?: RegExp;
  /** fallback: params from the typed text */
  extract?: (text: string, e: Entities) => Partial<P>;
} & (
  | { kind: "read"; run: (p: P, ctx: BotCtx) => Promise<BotTurn[]> }
  | { kind: "action"; prepare: (p: P, ctx: BotCtx) => Promise<Prepared<P>>; execute: (p: P, ctx: BotCtx) => Promise<BotTurn[]> }
);

export const defineTool = <P extends Record<string, unknown>>(t: ToolDef<P>) => t as unknown as ToolDef<Record<string, unknown>>;

/** zod → the small JSON-schema subset Gemini function calling accepts */
export function geminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>;
  const clean = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(clean);
    if (!n || typeof n !== "object") return n;
    const o = n as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      // validation details stay on our server (zod); the model only needs names, types and enums
      if (["$schema", "additionalProperties", "default", "$id", "examples", "pattern", "format", "minLength", "maxLength", "exclusiveMinimum", "exclusiveMaximum"].includes(k)) continue;
      if (k === "anyOf" && Array.isArray(v)) {
        // optional/nullable unions → the non-null branch
        const first = (v as Record<string, unknown>[]).find((x) => x.type !== "null") ?? v[0];
        Object.assign(out, clean(first) as object);
        continue;
      }
      out[k] = clean(v);
    }
    if (out.type === "integer") out.type = "integer";
    return out;
  };
  const res = clean(json) as Record<string, unknown>;
  if (!res.properties || !Object.keys(res.properties as object).length) return { type: "object", properties: {} };
  return res;
}

/** common param pieces */
export const P = {
  id: z.string().uuid(),
  text: (max = 200) => z.string().trim().min(1).max(max),
  optText: (max = 200) => z.string().trim().max(max).optional(),
  optNum: (min: number, max: number) => z.coerce.number().min(min).max(max).optional(),
};
