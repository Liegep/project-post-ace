import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { TextContent } from "@/hooks/useTextContents";

const sanitizeFilename = (s: string) =>
  (s || "conteudo").replace(/[^\w\-À-ú ]+/g, "").trim().slice(0, 80) || "conteudo";

/** Build printable HTML (used by both PDF and Word exports) */
function buildHtml(content: TextContent): string {
  const title = content.title || "";
  const subtitle = content.subtitle || "";
  const body = content.body || "";
  const obs = content.observations || "";
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #111; padding: 32px; max-width: 780px;">
      <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.25;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="font-size: 16px; color:#555; margin: 0 0 20px 0;">${escapeHtml(subtitle)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
      <div style="font-size: 14px; line-height: 1.7;">${body}</div>
      ${obs ? `<div style="margin-top:24px;padding:12px;background:#f6f6f6;border-left:3px solid #999;font-size:13px;"><strong>Observações:</strong><br/>${escapeHtml(obs).replace(/\n/g, "<br/>")}</div>` : ""}
    </div>
  `;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function exportTextContentToPdf(content: TextContent) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.background = "#fff";
  wrapper.style.width = "800px";
  wrapper.innerHTML = buildHtml(content);
  document.body.appendChild(wrapper);
  try {
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 20;
    pdf.addImage(imgData, "JPEG", 20, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 40;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 20;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 20, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 40;
    }
    pdf.save(`${sanitizeFilename(content.title)}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function exportTextContentToWord(content: TextContent) {
  const html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${escapeHtml(content.title)}</title></head>
<body>${buildHtml(content)}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(content.title)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
