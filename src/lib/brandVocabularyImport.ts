import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface VocabImportRow {
  term: string;
  category: string;
  brand: string;
  content_type: string;
  priority: string;
  frequency: string;
  emotion: string;
  related_words: string[];
  approved_phrases: string[];
  can_be_used: boolean;
  technical_notes: string;
  status: "approved" | "avoid" | "forbidden";
  notes: string;
}

const HEADER_MAP: Record<string, keyof VocabImportRow> = {
  // Portuguese
  "termo": "term", "palavra": "term", "palavra/conceito": "term",
  "categoria": "category",
  "marca": "brand",
  "tipo de conteudo": "content_type", "tipo de conteúdo": "content_type",
  "prioridade": "priority",
  "frequencia": "frequency", "frequência": "frequency",
  "tom emotivo": "emotion", "emocao": "emotion", "emoção": "emotion",
  "palavras relacionadas": "related_words", "palavras correlatas": "related_words",
  "frases aprovadas": "approved_phrases",
  "pode ser usada?": "can_be_used", "pode ser usada": "can_be_used", "pode usar": "can_be_used",
  "notas tecnicas": "technical_notes", "notas técnicas": "technical_notes", "observacoes": "notes", "observações": "notes",
  // Italian
  "parola": "term", "parola/concetto": "term", "parola / concetto": "term", "concetto": "term",
  "brand": "brand",
  "tipo di contenuto": "content_type",
  "priorità": "priority", "priorita": "priority",
  "frequenza": "frequency",
  "tono emotivo": "emotion",
  "parole correlate": "related_words", "parole relazionate": "related_words",
  "frasi approvate": "approved_phrases",
  "può essere usata?": "can_be_used", "puo essere usata?": "can_be_used", "può essere usata": "can_be_used", "puo essere usata": "can_be_used",
  "note tecniche": "technical_notes", "note": "notes",
  // English
  "term": "term", "word": "term", "concept": "term",
  "category": "category",
  "content type": "content_type",
  "priority": "priority",
  "frequency": "frequency",
  "emotion": "emotion", "emotional tone": "emotion",
  "related words": "related_words",
  "approved phrases": "approved_phrases", "approved sentences": "approved_phrases",
  "can be used?": "can_be_used", "can be used": "can_be_used",
  "technical notes": "technical_notes", "notes": "notes",
  "status": "status",
  // Spanish
  "palabra": "term", "concepto": "term",
  "categoría": "category",
  "tipo de contenido": "content_type",
  "prioridad": "priority",
  "frecuencia": "frequency",
  "palabras relacionadas": "related_words",
  "frases aprobadas": "approved_phrases",
  "¿se puede usar?": "can_be_used", "se puede usar": "can_be_used",
  "notas técnicas": "technical_notes", "notas tecnicas es": "technical_notes",
};

function norm(s: string) {
  return String(s || "").trim().toLowerCase();
}

function parseBool(v: any): boolean {
  const s = norm(String(v));
  return ["sì", "si", "sim", "yes", "y", "true", "1", "x", "ja"].includes(s);
}

function parseList(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v || "")
    .split(/[,;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function parseSpreadsheetFile(file: File): Promise<VocabImportRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows
    .map((raw) => {
      const mapped: any = { related_words: [], approved_phrases: [], can_be_used: true, status: "approved" };
      for (const [k, v] of Object.entries(raw)) {
        const field = HEADER_MAP[norm(k)];
        if (!field) continue;
        if (field === "related_words" || field === "approved_phrases") mapped[field] = parseList(v);
        else if (field === "can_be_used") mapped[field] = parseBool(v);
        else mapped[field] = String(v ?? "").trim();
      }
      if (!mapped.can_be_used) mapped.status = "avoid";
      return mapped as VocabImportRow;
    })
    .filter((r) => r.term);
}

export async function importVocabularyRows(clientId: string, rows: VocabImportRow[]) {
  if (!rows.length) return { inserted: 0 };
  const payload = rows.map((r) => ({
    client_id: clientId,
    term: r.term,
    category: r.category || "keyword",
    brand: r.brand || "",
    content_type: r.content_type || "",
    priority: r.priority || "",
    frequency: r.frequency || "",
    emotion: r.emotion || "",
    related_words: r.related_words || [],
    approved_phrases: r.approved_phrases || [],
    can_be_used: r.can_be_used !== false,
    technical_notes: r.technical_notes || "",
    status: r.status || "approved",
    notes: r.notes || "",
  }));
  const { error, count } = await supabase.from("brand_vocabulary").insert(payload, { count: "exact" });
  if (error) throw error;
  return { inserted: count ?? payload.length };
}

export function downloadVocabularyTemplate() {
  const rows = [
    {
      "Parola / Concetto": "Trust",
      "Categoria": "Detection",
      "Brand": "Kynagogi Detection",
      "Tipo di contenuto": "Istituzionale",
      "Priorità": "Alta",
      "Frequenza": "Settimanale",
      "Tono emotivo": "Affidabilità",
      "Parole correlate": "fiducia, sicurezza, professionalità",
      "Frasi approvate": "Trust is built through consistency.",
      "Può essere usata?": "Sì",
      "Note tecniche": "Usare in contesto operativo",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vocabolario");
  XLSX.writeFile(wb, "brand-vocabulary-template.xlsx");
}
