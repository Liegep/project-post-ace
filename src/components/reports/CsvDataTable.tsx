import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Table as TableIcon } from "lucide-react";

interface CsvDataTableProps {
  headers: string[];
  rows: Record<string, unknown>[];
}

const isNumeric = (v: unknown): boolean => {
  if (v === null || v === undefined || v === "") return false;
  const s = String(v).replace(/[R$€£\s.,%]/gi, "");
  return /^-?\d+$/.test(s);
};

const formatCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  // Try to parse as number for pretty formatting
  const cleaned = s.replace(/[R$€£\s]/gi, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(normalized);
  if (!isNaN(n) && /^-?[\d.,]+$/.test(cleaned)) {
    return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return s;
};

export function CsvDataTable({ headers, rows }: CsvDataTableProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayRows = useMemo(() => {
    if (!expanded) return [];
    return showAll ? rows : rows.slice(0, 50);
  }, [rows, expanded, showAll]);

  // Detect numeric columns for right-alignment
  const numericCols = useMemo(() => {
    const set = new Set<string>();
    const sample = rows.slice(0, 20);
    for (const h of headers) {
      const numericCount = sample.filter(r => isNumeric(r[h])).length;
      if (numericCount > sample.length / 2) set.add(h);
    }
    return set;
  }, [headers, rows]);

  if (rows.length === 0) return null;

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <TableIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold">Dados brutos do CSV</h3>
              <p className="text-[11px] text-muted-foreground">
                Pré-visualização das linhas importadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] tabular-nums bg-primary/10 text-primary border-primary/20">
              {rows.length.toLocaleString("pt-BR")} linhas
            </Badge>
            <Badge variant="secondary" className="text-[10px] tabular-nums bg-accent/10 text-accent-foreground border-accent/20">
              {headers.length} colunas
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-white/10">
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                  <tr>
                    {headers.map(h => (
                      <th
                        key={h}
                        className={`px-3 py-2 font-medium text-muted-foreground border-b border-white/10 whitespace-nowrap ${
                          numericCols.has(h) ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      {headers.map(h => (
                        <td
                          key={h}
                          className={`px-3 py-1.5 border-b border-white/5 whitespace-nowrap ${
                            numericCols.has(h) ? "text-right tabular-nums" : "text-left"
                          }`}
                        >
                          {formatCell(row[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAll && rows.length > 50 && (
              <div className="p-3 border-t border-white/10 flex items-center justify-center">
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowAll(true)}>
                  Ver todas as {rows.length.toLocaleString("pt-BR")} linhas
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
