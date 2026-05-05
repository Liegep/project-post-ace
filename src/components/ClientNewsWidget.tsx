import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, FileBarChart, Eye, Check, Bell, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS, it as itLocale, es as esLocale, sv as svLocale } from "date-fns/locale";
import type { Locale as DateLocale } from "date-fns";
import { InvoiceDetail } from "@/components/billing/ClientInvoicesPanel";
import type { Invoice } from "@/hooks/useInvoices";
import { generateInvoicePDF } from "@/lib/invoicePdf";
import { logBillingAccess } from "@/hooks/useBillingPermissions";

interface NewsItem {
  id: string;
  type: "invoice" | "report";
  title: string;
  subtitle: string;
  date: string;
}

type LocaleKey = "pt" | "en" | "it" | "es" | "sv";

const TRANSLATIONS: Record<LocaleKey, {
  news: string;
  newInvoice: string;
  newReport: string;
  invoiceFallback: (n: string | number) => string;
  reportFallback: string;
  issuedOn: string;
  view: string;
  ok: string;
  download: string;
}> = {
  pt: {
    news: "Novidades", newInvoice: "Nova fatura disponível", newReport: "Novo relatório disponível",
    invoiceFallback: (n) => `Fatura #${n}`, reportFallback: "Relatório de Mídias",
    issuedOn: "Emitida em", view: "Visualizar", ok: "OK", download: "Baixar fatura",
  },
  en: {
    news: "What's new", newInvoice: "New invoice available", newReport: "New report available",
    invoiceFallback: (n) => `Invoice #${n}`, reportFallback: "Social Report",
    issuedOn: "Issued on", view: "View", ok: "OK", download: "Download invoice",
  },
  it: {
    news: "Novità", newInvoice: "Nuova fattura disponibile", newReport: "Nuovo report disponibile",
    invoiceFallback: (n) => `Fattura #${n}`, reportFallback: "Report Social",
    issuedOn: "Emessa il", view: "Visualizza", ok: "OK", download: "Scarica fattura",
  },
  es: {
    news: "Novedades", newInvoice: "Nueva factura disponible", newReport: "Nuevo informe disponible",
    invoiceFallback: (n) => `Factura #${n}`, reportFallback: "Informe de Medios",
    issuedOn: "Emitida el", view: "Ver", ok: "OK", download: "Descargar factura",
  },
  sv: {
    news: "Nyheter", newInvoice: "Ny faktura tillgänglig", newReport: "Ny rapport tillgänglig",
    invoiceFallback: (n) => `Faktura #${n}`, reportFallback: "Sociala medierapport",
    issuedOn: "Utfärdad den", view: "Visa", ok: "OK", download: "Ladda ner faktura",
  },
};

const DATE_LOCALES: Record<LocaleKey, DateLocale> = {
  pt: ptBR, en: enUS, it: itLocale, es: esLocale, sv: svLocale,
};

interface ClientNewsWidgetProps {
  clientId: string;
  showInvoices: boolean;
  locale?: string;
}

export const ClientNewsWidget = ({ clientId, showInvoices, locale }: ClientNewsWidgetProps) => {
  const navigate = useNavigate();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const localeKey = ((locale as LocaleKey) in TRANSLATIONS ? (locale as LocaleKey) : "pt");
  const t = TRANSLATIONS[localeKey];
  const dateLocale = DATE_LOCALES[localeKey];

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);

      const { data: seenData } = await supabase
        .from("client_seen_items")
        .select("item_type, item_id")
        .eq("user_id", session.user.id);

      const seenSet = new Set(
        (seenData || []).map((s: any) => `${s.item_type}:${s.item_id}`)
      );

      const items: NewsItem[] = [];

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
              title: inv.title || t.invoiceFallback(inv.invoice_number),
              subtitle: `${t.issuedOn} ${format(new Date(inv.issue_date), "dd/MM/yyyy", { locale: dateLocale })}`,
              date: inv.issue_date,
            });
          }
        });
      }

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
            title: rep.title || t.reportFallback,
            subtitle: `${format(new Date(rep.period_start), "dd/MM", { locale: dateLocale })} — ${format(new Date(rep.period_end), "dd/MM/yyyy", { locale: dateLocale })}`,
            date: rep.created_at,
          });
        }
      });

      setNewsItems(items);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, showInvoices, localeKey]);

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
        <h2 className="font-semibold text-foreground">{t.news}</h2>
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
                  {item.type === "invoice" ? t.newInvoice : t.newReport}
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
                  {t.view}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-muted-foreground"
                onClick={() => handleDismiss(item)}
              >
                <Check className="h-3.5 w-3.5" />
                {t.ok}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
