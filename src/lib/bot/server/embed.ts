/**
 * Free, local sentence embeddings (Xenova/all-MiniLM-L6-v2 via transformers.js) for meaning-based
 * matching in the fallback engine. Runs on our server — nothing is sent anywhere.
 * Example phrasings + FAQ questions are pre-computed by `npm run bot:index` (src/data/bot-index.json);
 * only the user's question is embedded at runtime. If the model isn't ready within the time budget,
 * the fallback simply works without it.
 */
import index from "@/data/bot-index.json";

export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";

type Extractor = (texts: string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;
let loading: Promise<Extractor> | null = null;
let failedAt = 0;

export function embeddingsEnabled() {
  return process.env.BOT_EMBEDDINGS !== "off";
}

function load(): Promise<Extractor> | null {
  if (!embeddingsEnabled()) return null;
  if (failedAt && Date.now() - failedAt < 10 * 60e3) return null; // retry at most every 10 minutes
  if (!loading) {
    loading = (async () => {
      const t = await import("@huggingface/transformers");
      // serverless: only /tmp is writable
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) t.env.cacheDir = "/tmp/hf-cache";
      t.env.allowLocalModels = false;
      return (await t.pipeline("feature-extraction", EMBED_MODEL, { dtype: "q8" })) as unknown as Extractor;
    })().catch((e) => {
      failedAt = Date.now();
      loading = null;
      console.warn("bot embeddings unavailable:", e instanceof Error ? e.message : e);
      throw e;
    });
  }
  return loading;
}

/** start loading early (e.g. on the welcome request) so the first real question is fast */
export function warmEmbeddings() {
  load()?.catch(() => {});
}

export async function embed(texts: string[], timeoutMs = 4000): Promise<Float32Array[] | null> {
  const p = load();
  if (!p || !texts.length) return null;
  try {
    const ex = await Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
    if (!ex) return null;
    const out = await ex(texts, { pooling: "mean", normalize: true });
    const d = out.dims[out.dims.length - 1];
    return texts.map((_, i) => out.data.slice(i * d, (i + 1) * d));
  } catch {
    return null;
  }
}

export const cosine = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/** int8-quantised vectors from bot-index.json, keyed by the exact text */
let vectors: Map<string, Float32Array> | null = null;
export function indexVectors(): Map<string, Float32Array> {
  if (vectors) return vectors;
  vectors = new Map();
  const idx = index as { dims: number; items: { text: string; v: string }[] };
  for (const it of idx.items ?? []) {
    const bytes = Buffer.from(it.v, "base64");
    const f = new Float32Array(bytes.length);
    let norm = 0;
    for (let i = 0; i < bytes.length; i++) {
      const x = (bytes[i] > 127 ? bytes[i] - 256 : bytes[i]) / 127;
      f[i] = x;
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < f.length; i++) f[i] /= norm;
    vectors.set(it.text, f);
  }
  return vectors;
}

/** quantise for the index file (per-vector scale; vectors are re-normalised on load) */
export function quantise(v: Float32Array) {
  const b = Buffer.alloc(v.length);
  let max = 0;
  for (let i = 0; i < v.length; i++) max = Math.max(max, Math.abs(v[i]));
  const k = 127 / (max || 1);
  for (let i = 0; i < v.length; i++) b[i] = Math.max(-127, Math.min(127, Math.round(v[i] * k))) & 0xff;
  return b.toString("base64");
}
