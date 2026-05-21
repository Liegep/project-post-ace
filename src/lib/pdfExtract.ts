import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface Token {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
}

interface Line {
  y: number;
  h: number;
  tokens: Token[];
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isBoldFont(name: string) {
  return /bold|black|heavy|semibold|demi/i.test(name);
}
function isItalicFont(name: string) {
  return /italic|oblique/i.test(name);
}

function renderLineHtml(line: Line, baseSize: number): string {
  // Sort by X
  const tokens = [...line.tokens].sort((a, b) => a.x - b.x);

  // Build runs with consistent bold/italic
  let html = "";
  let i = 0;
  let prevRight: number | null = null;
  while (i < tokens.length) {
    const t = tokens[i];
    // Insert space if there is a visible gap
    if (prevRight !== null) {
      const gap = t.x - prevRight;
      if (gap > baseSize * 0.25) html += " ";
    }
    let text = t.str;
    let j = i + 1;
    // Merge consecutive tokens with the same style and no big gap
    while (j < tokens.length) {
      const n = tokens[j];
      const gap = n.x - (tokens[j - 1].x + tokens[j - 1].w);
      if (n.bold === t.bold && n.italic === t.italic && gap < baseSize * 0.25) {
        text += n.str;
        j++;
      } else break;
    }
    let chunk = escapeHtml(text);
    if (t.bold) chunk = `<strong>${chunk}</strong>`;
    if (t.italic) chunk = `<em>${chunk}</em>`;
    html += chunk;
    prevRight = tokens[j - 1].x + tokens[j - 1].w;
    i = j;
  }
  return html.replace(/\s+/g, " ").trim();
}

function lineText(line: Line): string {
  return line.tokens
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((t) => t.str)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyLine(text: string): { type: "li-bullet" | "li-num" | "p"; clean: string } {
  // Bullet markers
  const bullet = text.match(/^\s*([•·◦▪▫●○■□–—*-])\s+(.*)$/);
  if (bullet) return { type: "li-bullet", clean: bullet[2] };
  const num = text.match(/^\s*(\d+[.)]|[a-zA-Z][.)])\s+(.*)$/);
  if (num) return { type: "li-num", clean: num[2] };
  return { type: "p", clean: text };
}

/**
 * Extracts text from a PDF file, returning HTML that approximates
 * the original visual structure: headings (by font size), bold/italic
 * runs, paragraphs, and bullet/numbered lists.
 */
export async function extractPdfAsHtml(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const pagesHtml: string[] = [];
  // First pass: collect all heights to find body font baseline
  const allHeights: number[] = [];
  const pageLines: Line[][] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    const tokens: Token[] = [];
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str) continue;
      const tr = item.transform as number[];
      const h = Math.abs(tr[3]) || Math.abs(tr[0]) || item.height || 10;
      const x = tr[4];
      const y = tr[5];
      const fontName: string = item.fontName || "";
      tokens.push({
        str: item.str,
        x,
        y,
        w: item.width || h * item.str.length * 0.5,
        h,
        fontName,
        bold: isBoldFont(fontName),
        italic: isItalicFont(fontName),
      });
      allHeights.push(h);
    }

    // Group tokens into lines by Y (with tolerance based on height)
    const lines: Line[] = [];
    const sorted = tokens.slice().sort((a, b) => b.y - a.y);
    for (const t of sorted) {
      const tol = Math.max(2, t.h * 0.5);
      const existing = lines.find((l) => Math.abs(l.y - t.y) <= tol);
      if (existing) {
        existing.tokens.push(t);
        existing.h = Math.max(existing.h, t.h);
      } else {
        lines.push({ y: t.y, h: t.h, tokens: [t] });
      }
    }
    lines.sort((a, b) => b.y - a.y);
    pageLines.push(lines);
  }

  // Determine body font size as the median of all heights
  const sortedH = allHeights.slice().sort((a, b) => a - b);
  const baseSize = sortedH.length ? sortedH[Math.floor(sortedH.length / 2)] : 10;

  for (let p = 0; p < pageLines.length; p++) {
    const lines = pageLines[p];
    const blocks: string[] = [];
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    const flushList = () => {
      if (listBuffer) {
        const tag = listBuffer.type;
        blocks.push(
          `<${tag}>${listBuffer.items.map((i) => `<li>${i}</li>`).join("")}</${tag}>`
        );
        listBuffer = null;
      }
    };

    let paraBuffer: { html: string; endsWithHyphen: boolean } | null = null;
    const flushPara = () => {
      if (paraBuffer && paraBuffer.html.trim()) {
        blocks.push(`<p>${paraBuffer.html.trim()}</p>`);
      }
      paraBuffer = null;
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const rawText = lineText(line);
      if (!rawText) continue;

      // Heading detection
      const ratio = line.h / baseSize;
      const allBold = line.tokens.every((t) => t.bold);
      let heading: 1 | 2 | 3 | null = null;
      if (ratio >= 1.7) heading = 1;
      else if (ratio >= 1.35) heading = 2;
      else if (ratio >= 1.15 || (allBold && ratio >= 1.05 && rawText.length < 100)) heading = 3;

      const { type, clean } = classifyLine(rawText);

      if (heading) {
        flushPara();
        flushList();
        const html = renderLineHtml(line, baseSize);
        blocks.push(`<h${heading}>${html}</h${heading}>`);
        continue;
      }

      if (type === "li-bullet" || type === "li-num") {
        flushPara();
        const desired: "ul" | "ol" = type === "li-bullet" ? "ul" : "ol";
        if (!listBuffer || listBuffer.type !== desired) {
          flushList();
          listBuffer = { type: desired, items: [] };
        }
        // Render the line then strip the leading marker tokens for cleanliness
        const html = renderLineHtml(line, baseSize)
          .replace(/^\s*(?:<[^>]+>)*\s*[•·◦▪▫●○■□–—*\-]\s+/, "")
          .replace(/^\s*(?:<[^>]+>)*\s*\d+[.)]\s+/, "")
          .replace(/^\s*(?:<[^>]+>)*\s*[a-zA-Z][.)]\s+/, "");
        listBuffer.items.push(html);
        continue;
      }

      flushList();

      // Paragraph aggregation
      const html = renderLineHtml(line, baseSize);
      const endsWithHyphen = /[\w]-$/.test(rawText);
      if (!paraBuffer) {
        paraBuffer = { html, endsWithHyphen };
      } else {
        // Decide if this is a new paragraph: large vertical gap
        const prev = lines[idx - 1];
        const gap = prev ? prev.y - line.y : 0;
        const newPara = gap > line.h * 1.8;
        if (newPara) {
          flushPara();
          paraBuffer = { html, endsWithHyphen };
        } else {
          // Join — strip hyphenation if previous line ended with hyphen
          if (paraBuffer.endsWithHyphen) {
            paraBuffer.html = paraBuffer.html.replace(/-\s*$/, "") + html;
          } else {
            paraBuffer.html += " " + html;
          }
          paraBuffer.endsWithHyphen = endsWithHyphen;
        }
      }
    }
    flushPara();
    flushList();

    pagesHtml.push(blocks.join("\n"));
  }

  return pagesHtml.join('\n<hr />\n');
}
