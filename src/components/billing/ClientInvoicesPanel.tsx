import { useState } from "react";
import { useInvoices, useInvoiceItems, Invoice } from "@/hooks/useInvoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Receipt, CheckCircle2, AlertCircle, Clock, XCircle, ChevronRight, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { generateInvoicePDF } from "@/lib/invoicePdf";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberta", color: "bg-blue-500/15 text-blue-600", icon: Clock },
  paid: { label: "Paga", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  overdue: { label: "Atrasada", color: "bg-red-500/15 text-red-600", icon: AlertCircle },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: XCircle },
};

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const { items, loading } = useInvoiceItems(invoice.id);

  const subtotal = items.reduce((sum, it) => sum + Number(it.total_price || 0), 0);
  const discount = Number(invoice.discount || 0);
  const surcharge = Number(invoice.surcharge || 0);
  const total = subtotal - discount + surcharge;

  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice, items, total, subtotal);
  };

  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Status</span>
          <Badge variant="secondary" className={`${cfg.color} ml-2`}>
            <Icon className="h-3 w-3 mr-1" />
            {cfg.label}
          </Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Emissão: </span>
          <span className="font-medium">{format(new Date(invoice.issue_date), "dd/MM/yyyy")}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Vencimento: </span>
          <span className="font-medium">{format(new Date(invoice.due_date), "dd/MM/yyyy")}</span>
        </div>
        {invoice.paid_at && (
          <div>
            <span className="text-muted-foreground">Pago em: </span>
            <span className="font-medium">{format(new Date(invoice.paid_at), "dd/MM/yyyy")}</span>
          </div>
        )}
        {invoice.payment_method && invoice.payment_method !== "" && (
          <div>
            <span className="text-muted-foreground">Método: </span>
            <span className="font-medium capitalize">{invoice.payment_method}</span>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      <Separator />

      {/* Items */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-2">Carregando itens...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhum item nesta fatura.</p>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Itens</h4>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.name || "Item"}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.quantity}x · R$ {Number(item.unit_price || 0).toFixed(2)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground ml-3">
                  R$ {Number(item.total_price || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-sm text-emerald-600">
                <span>Desconto</span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
            )}
            {surcharge > 0 && (
              <div className="flex justify-between items-center text-sm text-amber-600">
                <span>Acréscimo</span>
                <span>+ R$ {surcharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-base font-bold text-foreground">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Download PDF Button */}
      {!loading && items.length > 0 && (
        <>
          <Separator />
          <Button onClick={handleDownloadPDF} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar fatura em PDF
          </Button>
        </>
      )}
    </div>
  );
}

export function ClientInvoicesPanel({ clientId }: { clientId: string }) {
  const { invoices, loading } = useInvoices(clientId);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const visibleInvoices = invoices.filter((inv) => inv.client_visible !== false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Faturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando faturas...</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleInvoices.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Faturas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleInvoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.open;
            const Icon = cfg.icon;
            return (
              <button
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="w-full flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {inv.title || `Fatura #${inv.invoice_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {format(new Date(inv.due_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={`${cfg.color} text-xs`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInvoice} onOpenChange={(v) => { if (!v) setSelectedInvoice(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.title || `Fatura #${selectedInvoice?.invoice_number}`}
            </DialogTitle>
            <DialogDescription>
              Detalhes da fatura
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
