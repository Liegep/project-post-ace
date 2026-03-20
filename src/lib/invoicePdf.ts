import { Invoice, InvoiceItem } from "@/hooks/useInvoices";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  paid: "Paga",
  overdue: "Atrasada",
  cancelled: "Cancelada",
};

export function generateInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[],
  total: number,
  subtotal: number
) {
  const clientName = invoice.clients?.name || "Cliente";
  const discount = Number(invoice.discount || 0);
  const surcharge = Number(invoice.surcharge || 0);

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Fatura #${invoice.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #e5e5e5; padding-bottom: 24px; }
  .header h1 { font-size: 28px; font-weight: 700; color: #111; }
  .header .invoice-num { font-size: 14px; color: #666; font-family: monospace; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
  .meta-block p { font-size: 14px; line-height: 1.5; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .status-open { background: #dbeafe; color: #2563eb; }
  .status-paid { background: #d1fae5; color: #059669; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .status-cancelled { background: #f3f4f6; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; }
  tbody td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals .row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #111; padding-top: 10px; margin-top: 6px; }
  .notes { margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px; }
  .notes h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 8px; }
  .notes p { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>FATURA</h1>
      <span class="invoice-num">#${invoice.invoice_number}</span>
    </div>
    <div style="text-align:right">
      <span class="status status-${invoice.status}">${STATUS_LABELS[invoice.status]}</span>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <h3>Cliente</h3>
      <p><strong>${clientName}</strong></p>
    </div>
    <div class="meta-block">
      <h3>Detalhes</h3>
      <p>
        Emissão: ${format(new Date(invoice.issue_date), "dd/MM/yyyy")}<br>
        Vencimento: ${format(new Date(invoice.due_date), "dd/MM/yyyy")}
        ${invoice.period_start && invoice.period_end ? `<br>Período: ${format(new Date(invoice.period_start), "dd/MM/yyyy")} - ${format(new Date(invoice.period_end), "dd/MM/yyyy")}` : ""}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Categoria</th>
        <th>Data</th>
        <th class="text-right">Qtd</th>
        <th class="text-right">Unitário</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.name}${item.description ? `<br><span style="color:#999;font-size:11px">${item.description}</span>` : ""}</td>
          <td>${item.category}</td>
          <td>${format(new Date(item.service_date), "dd/MM/yyyy")}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">R$ ${Number(item.unit_price).toFixed(2)}</td>
          <td class="text-right">R$ ${Number(item.total_price).toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2)}</span></div>
    ${discount > 0 ? `<div class="row" style="color:#059669"><span>Desconto</span><span>- R$ ${discount.toFixed(2)}</span></div>` : ""}
    ${surcharge > 0 ? `<div class="row" style="color:#d97706"><span>Acréscimo</span><span>+ R$ ${surcharge.toFixed(2)}</span></div>` : ""}
    <div class="row total"><span>Total</span><span>R$ ${total.toFixed(2)}</span></div>
  </div>

  ${invoice.notes ? `
  <div class="notes">
    <h3>Observações</h3>
    <p>${invoice.notes}</p>
  </div>
  ` : ""}
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
