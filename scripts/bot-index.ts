/**
 * Pre-computes MiniLM embeddings for every tool example phrasing + built-in FAQ question
 * → src/data/bot-index.json (int8, ~0.5 KB per phrase). Run after editing examples or bot-faq.ts:
 *   npm run bot:index
 * Free and local: the model (Xenova/all-MiniLM-L6-v2) is downloaded once and runs on this machine.
 */
import { writeFileSync } from "node:fs";
import { ALL_TOOLS } from "../src/lib/bot/server/tools";
import { BOT_FAQ } from "../src/data/bot-faq";
import { EMBED_MODEL, embed, quantise } from "../src/lib/bot/server/embed";

async function main() {
  const texts = [...new Set([...ALL_TOOLS.flatMap((t) => t.examples), ...BOT_FAQ.map((f) => f.q)])];
  console.log(`Embedding ${texts.length} phrases with ${EMBED_MODEL}…`);
  const items: { text: string; v: string }[] = [];
  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32);
    const vecs = await embed(batch, 300_000);
    if (!vecs) throw new Error("Embedding model failed to load");
    batch.forEach((text, j) => items.push({ text, v: quantise(vecs[j]) }));
    process.stdout.write(`  ${Math.min(i + 32, texts.length)}/${texts.length}\r`);
  }
  writeFileSync(new URL("../src/data/bot-index.json", import.meta.url), JSON.stringify({ model: EMBED_MODEL, dims: 384, items }) + "\n");
  console.log(`\n✓ src/data/bot-index.json — ${items.length} phrases`);
}
main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
