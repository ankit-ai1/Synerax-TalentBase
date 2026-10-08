/** Plain-text extraction from CV files: PDF (unpdf — works in serverless) and DOCX (mammoth) */

export const MSG_UNSUPPORTED = "Please upload a PDF or DOCX file — we can't read old .doc files or images.";
export const MSG_NO_TEXT = "We couldn't read text from this CV, please fill the details manually.";

export type FileKind = "pdf" | "docx" | "unsupported";

export function detectKind(buf: Buffer, mime = "", fileName = ""): FileKind {
  // magic bytes first — never trust the extension alone
  if (buf.length > 4 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && (/wordprocessingml|docx/i.test(mime) || /\.docx$/i.test(fileName) || buf.includes(Buffer.from("word/")))) return "docx";
  return "unsupported";
}

export async function extractText(buf: Buffer, mime = "", fileName = ""): Promise<{ text: string; warnings: string[]; kind: FileKind }> {
  const kind = detectKind(buf, mime, fileName);
  if (kind === "unsupported") return { text: "", warnings: [MSG_UNSUPPORTED], kind };
  let text = "";
  try {
    if (kind === "pdf") {
      const { getDocumentProxy, extractText: pdfText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const res = await pdfText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
    } else {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ buffer: buf });
      text = res.value;
    }
  } catch {
    return { text: "", warnings: [MSG_NO_TEXT], kind };
  }
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  if (letters < 80) return { text: text.trim(), warnings: [MSG_NO_TEXT], kind }; // scanned / image-only PDF
  return { text, warnings: [], kind };
}
