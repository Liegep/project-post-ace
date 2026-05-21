import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extracts text from a PDF file, returning HTML that preserves
 * paragraphs and line breaks as closely as possible to the original.
 */
export async function extractPdfAsHtml(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by their Y coordinate to reconstruct lines
    const lines = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as any[]) {
      if (!("str" in item)) continue;
      const transform = item.transform as number[];
      const y = Math.round(transform[5]);
      const x = transform[4];
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x, str: item.str });
    }

    // Sort lines top-to-bottom (PDF Y grows upward)
    const sortedYs = [...lines.keys()].sort((a, b) => b - a);

    const lineStrings: string[] = [];
    for (const y of sortedYs) {
      const parts = lines.get(y)!.sort((a, b) => a.x - b.x);
      const text = parts.map((p) => p.str).join("").replace(/\s+/g, " ").trim();
      if (text) lineStrings.push(text);
    }

    // Merge consecutive lines into paragraphs (blank line = new paragraph)
    const paragraphs: string[] = [];
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
    };
    for (const ln of lineStrings) {
      if (!ln) {
        flush();
      } else {
        buffer.push(ln);
        // If line ends with punctuation, treat as paragraph end
        if (/[.!?:;]$/.test(ln) && ln.length > 60) flush();
      }
    }
    flush();

    pages.push(
      paragraphs
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("\n")
    );
  }

  return pages.join('\n<hr />\n');
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
