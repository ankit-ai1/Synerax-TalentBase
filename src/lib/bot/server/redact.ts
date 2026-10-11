/**
 * Strip personal identifiers from typed text BEFORE it goes anywhere near the AI provider.
 * Emails, phone numbers, PAN/Aadhaar-like numbers, long digit runs, URLs and internal ids.
 */
export const MAX_CHARS = 1000;

export function redact(input: string): string {
  return String(input ?? "")
    .slice(0, MAX_CHARS)
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link]")
    .replace(/\b[a-z0-9-]+\.(?:com|in|co|io|net|org|ai|dev|app)(?:\/\S*)?\b/gi, (m) => (/^\d/.test(m) ? m : "[link]"))
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, "[id]") // PAN
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[id]") // Aadhaar
    .replace(/(?:\+?91[\s-]?)?\b[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g, "[phone]") // Indian mobile
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[number]") // any other long number
    .replace(/\s+/g, " ")
    .trim();
}
