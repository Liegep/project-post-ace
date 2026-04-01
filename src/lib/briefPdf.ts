import { getTemplate } from "@/lib/briefTemplates";
import { tLabel, tMeta, briefLocaleNames, type BriefLocale } from "@/lib/briefTranslations";

interface BriefForPdf {
  title: string;
  category: string;
  answers: Record<string, any>;
  locale: string;
  updated_at: string;
}

export function generateBriefPdfHtml(brief: BriefForPdf): string {
  const template = getTemplate(brief.category);
  const questions = template?.questions || [];
  const locale = (brief.locale || "pt") as BriefLocale;
  const templateName = (template && tMeta(template.id, "name", locale)) || template?.name || brief.category;

  const rows = questions
    .map(q => {
      const val = brief.answers[q.id];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) return "";

      const label = tLabel(template!.id, q.id, locale) || q.label;
      let displayVal = "";

      if (q.type === "yes_no") {
        displayVal = val === true
          ? (locale === "en" ? "Yes" : locale === "es" ? "Sí" : "Sim")
          : (locale === "en" ? "No" : "Não");
      } else if (q.type === "checkbox" && Array.isArray(val)) {
        displayVal = val.join(", ");
      } else if (q.type === "file_upload" && Array.isArray(val)) {
        displayVal = val.map((url: string) => `<a href="${url}" target="_blank">${decodeURIComponent(url.split("/").pop() || "arquivo")}</a>`).join("<br/>");
      } else if (q.type === "link" && typeof val === "string") {
        displayVal = `<a href="${val}" target="_blank">${val}</a>`;
      } else {
        displayVal = String(val).replace(/\n/g, "<br/>");
      }

      return `
        <div style="margin-bottom:16px;padding:12px 16px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6c757d;margin-bottom:6px;">${label}</div>
          <div style="font-size:13px;color:#212529;line-height:1.5;">${displayVal}</div>
        </div>`;
    })
    .filter(Boolean)
    .join("");

  const date = new Date(brief.updated_at).toLocaleDateString(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:40px;color:#212529;max-width:700px;margin:auto;}
  h1{font-size:22px;margin:0 0 4px;}
  .meta{font-size:11px;color:#6c757d;margin-bottom:24px;}
  .badge{display:inline-block;padding:2px 8px;background:#e9ecef;border-radius:10px;font-size:10px;margin-right:6px;}
  a{color:#0d6efd;text-decoration:none;}
  @media print{body{padding:20px;}}
</style></head>
<body>
  <h1>${brief.title}</h1>
  <div class="meta">
    <span class="badge">${templateName}</span>
    <span class="badge">${briefLocaleNames[locale] || locale}</span>
    <span>${date}</span>
  </div>
  ${rows}
</body>
</html>`;
}

export function downloadBriefPdf(brief: BriefForPdf) {
  const html = generateBriefPdfHtml(brief);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
