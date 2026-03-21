import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FileBarChart, Eye, Check, Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NewsItem {
  id: string;
  type: "invoice" | "report";
  title: string;
  subtitle: string;
  date: string;
}

interface ClientNewsWidgetProps {
  clientId: string;
  showInvoices: boolean;
}

export const ClientNewsWidget = ({ clientId, showInvoices }: ClientNewsWidgetProps) => {
  const navigate = useNavigate();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);

      // Fetch seen items for this user
      const { data: seenData } = await supabase
        .from("client_seen_items")
        .select("item_type, item_id")
        .eq("user_id", session.user.id);

      const seenSet = new Set(
        (seenData || []).map((s: any) => `${s.item_type}:${s.item_id}`)
      );

      const items: NewsItem[] = [];

      // Fetch invoices
      if (showInvoices) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, title, invoice_number, issue_date, status")
          .eq("client_id", clientId)
          .eq("client_visible", true)
          .order("created_at", { ascending: false });

        (invoices || []).forEach((inv: any) => {
          if (!seenSet.has(`invoice:${inv.id}`)) {
            items.push({
              id: inv.id,
              type: "invoice",
              title: inv.title || `Fatura #${inv.invoice_number}`,
              subtitle: `Emitida em ${format(new Date(inv.issue_date), "dd/MM/yyyy", { locale: ptBR })}`,
              date: inv.issue_date,
            });
          }
        });
      }

      // Fetch reports
      const { data: reports } = await supabase
        .from("social_reports")
        .select("id, title, period_start, period_end, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      (reports || []).forEach((rep: any) => {
        if (!seenSet.has(`report:${rep.id}`)) {
          items.push({
            id: rep.id,
            type: "report",
            title: rep.title || "Relatório de Mídias",
            subtitle: `${format(new Date(rep.period_start), "dd/MM", { locale: ptBR })} — ${format(new Date(rep.period_end), "dd/MM/yyyy", { locale: ptBR })}`,
            date: rep.created_at,
          });
        }
      });

      setNewsItems(items);
      setLoading(false);
    };
    init();
  }, [clientId, showInvoices]);

  const markAsSeen = async (item: NewsItem) => {
    if (!userId) return;
    await supabase.from("client_seen_items").insert({
      user_id: userId,
      item_type: item.type,
      item_id: item.id,
    });
    setNewsItems((prev) => prev.filter((n) => n.id !== item.id));
  };

  const handleView = (item: NewsItem) => {
    markAsSeen(item);
    if (item.type === "report") {
      navigate(`/reports/${item.id}`);
    }
    // For invoices, just mark as seen (they're on the invoices panel below)
  };

  const handleDismiss = (item: NewsItem) => {
    markAsSeen(item);
  };

  if (loading || newsItems.length === 0) return null;

  return (
    <Card className="mb-8 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold text-foreground">Novidades</h2>
        <Badge variant="secondary" className="text-xs">
          {newsItems.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {newsItems.map((item) => (
          <div
            key={`${item.type}:${item.id}`}
            className="flex items-center justify-between gap-3 rounded-lg bg-background px-4 py-3 border"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {item.type === "invoice" ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <FileBarChart className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.type === "invoice" ? "Nova fatura disponível" : "Novo relatório disponível"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.title} · {item.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {item.type === "report" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => handleView(item)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Visualizar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-muted-foreground"
                onClick={() => handleDismiss(item)}
              >
                <Check className="h-3.5 w-3.5" />
                OK
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
