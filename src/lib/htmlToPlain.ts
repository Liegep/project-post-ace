/**
 * Converts HTML (from RichTextEditor) into readable plain text preserving
 * line breaks between block elements and list items. If the input is not
 * HTML, it's returned as-is.
 */
const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

export function htmlToPlainText(input: string): string {
  if (!input) return "";
  if (!looksLikeHtml(input)) return input;

  if (typeof document === "undefined") {
    // SSR fallback: strip tags naively
    return input
      .replace(/<\/(p|div|li|h[1-6]|blockquote|br)>/gi, "\n")
      .replace(/<br\s*\/?>(?!\n)/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const container = document.createElement("div");
  container.innerHTML = input;

  const BLOCK = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "HR", "UL", "OL"]);
  let out = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === "BR") {
      out += "\n";
      return;
    }
    if (tag === "LI") {
      out += "• ";
    }
    el.childNodes.forEach(walk);
    if (BLOCK.has(tag)) out += "\n";
  };

  container.childNodes.forEach(walk);

  return out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}
