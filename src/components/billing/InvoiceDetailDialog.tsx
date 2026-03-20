import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Invoice,
  InvoiceItem,
  useInvoiceItems,
  useInvoiceAttachments,
  updateInvoice,
  deleteInvoice,
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  createInvoiceAttachment,
  deleteInvoiceAttachment,
} from "@/hooks/useInvoices";
import { useUserRole } from "@/hooks/useUserRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Download, Upload, FileText, Eye,
  CheckCircle2, AlertCircle, XCircle, Clock, Paperclip, X
} from "lucide-react";
import { format } from "date-fns";
import { generateInvoicePDF } from "@/lib/invoicePdf";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberta", color: "bg-blue-500/15 text-blue-600", icon: Clock },
  paid: { label: "Paga", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  overdue: { label: "Atrasada", color: "bg-red-500/15 text-red-600", icon: AlertCircle },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const CATEGORIES = [
  { value: "post", label: "Post" },
  { value: "reels", label: "Reels" },
  { value: "carrossel", label: "Carrossel" },
  { value: "arte", label: "Arte" },
  { value: "capa", label: "Capa" },
  { value: "design", label: "Design" },
  { value: "outro", label: "Outro" },
];

interface Props {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function InvoiceDetailDialog({ invoice, open, onOpenChange, onUpdate }: Props) {
  const { userId } = useUserRole();
  const { items, loading: itemsLoading, refetch: refetchItems } = useInvoiceItems(invoice.id);
  const { attachments, refetch: refetchAttachments } = useInvoiceAttachments(invoice.id);

  // Item form
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemCategory, setItemCategory] = useState("outro");
  const [itemDate, setItemDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [itemQty, setItemQty] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Invoice edit
  const [editingInvoice, setEditingInvoice] = useState(false);
  const [invStatus, setInvStatus] = useState(invoice.status);
  const [invDiscount, setInvDiscount] = useState(String(invoice.discount || 0));
  const [invSurcharge, setInvSurcharge] = useState(String(invoice.surcharge || 0));
  const [invNotes, setInvNotes] = useState(invoice.notes || "");
  const [invDueDate, setInvDueDate] = useState(invoice.due_date);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setInvStatus(invoice.status);
    setInvDiscount(String(invoice.discount || 0));
    setInvSurcharge(String(invoice.surcharge || 0));
    setInvNotes(invoice.notes || "");
    setInvDueDate(invoice.due_date);
  }, [invoice]);

  const subtotal = items.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
  const total = subtotal - Number(invDiscount || 0) + Number(invSurcharge || 0);

  const resetItemForm = () => {
    setItemName("");
    setItemDesc("");
    setItemCategory("outro");
    setItemDate(format(new Date(), "yyyy-MM-dd"));
    setItemQty("1");
    setItemUnitPrice("");
    setItemNotes("");
    setEditingItem(null);
  };

  const handleSaveItem = async () => {
    if (!itemName) return;
    setSavingItem(true);
    const qty = Number(itemQty) || 1;
    const unit = Number(itemUnitPrice) || 0;
    const totalPrice = qty * unit;

    try {
      if (editingItem) {
        await updateInvoiceItem(editingItem.id, {
          name: itemName,
          description: itemDesc,
          category: itemCategory,
          service_date: itemDate,
          quantity: qty,
          unit_price: unit,
          total_price: totalPrice,
          notes: itemNotes,
        });
        toast({ title: "Item atualizado" });
      } else {
        await createInvoiceItem({
          invoice_id: invoice.id,
          name: itemName,
          description: itemDesc,
          category: itemCategory,
          service_date: itemDate,
          quantity: qty,
          unit_price: unit,
          total_price: totalPrice,
          notes: itemNotes,
        });
        toast({ title: "Item adicionado" });
      }
      resetItemForm();
      setAddingItem(false);
      refetchItems();
      onUpdate();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteInvoiceItem(id);
    refetchItems();
    onUpdate();
    toast({ title: "Item removido" });
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description);
    setItemCategory(item.category);
    setItemDate(item.service_date);
    setItemQty(String(item.quantity));
    setItemUnitPrice(String(item.unit_price));
    setItemNotes(item.notes);
    setAddingItem(true);
  };

  const handleSaveInvoice = async () => {
    try {
      await updateInvoice(invoice.id, {
        status: invStatus as any,
        discount: Number(invDiscount) || 0,
        surcharge: Number(invSurcharge) || 0,
        notes: invNotes,
        due_date: invDueDate,
      } as any);
      toast({ title: "Fatura atualizada" });
      setEditingInvoice(false);
      onUpdate();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async () => {
    if (!confirm("Tem certeza que deseja excluir esta fatura?")) return;
    await deleteInvoice(invoice.id);
    toast({ title: "Fatura excluída" });
    onOpenChange(false);
    onUpdate();
  };

  const handleUploadNF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `invoices/${invoice.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      await createInvoiceAttachment({
        invoice_id: invoice.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        uploaded_by: userId || undefined,
      });
      toast({ title: "Nota fiscal anexada" });
      refetchAttachments();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    await deleteInvoiceAttachment(id);
    toast({ title: "Anexo removido" });
    refetchAttachments();
  };

  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice, items, total, subtotal);
  };

  const cfg = STATUS_CONFIG[invoice.status];
  const Icon = cfg.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">#{invoice.invoice_number}</span>
              {invoice.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Invoice info */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className={cfg.color}>
            <Icon className="h-3 w-3 mr-1" /> {cfg.label}
          </Badge>
          <span>{invoice.clients?.name}</span>
          {invoice.period_start && invoice.period_end && (
            <span>
              {format(new Date(invoice.period_start), "dd/MM")} - {format(new Date(invoice.period_end), "dd/MM/yyyy")}
            </span>
          )}
          <span>Emissão: {format(new Date(invoice.issue_date), "dd/MM/yyyy")}</span>
          <span>Venc: {format(new Date(invoice.due_date), "dd/MM/yyyy")}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditingInvoice(!editingInvoice)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar PDF
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDeleteInvoice}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
          </Button>
        </div>

        {/* Edit invoice section */}
        {editingInvoice && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={invStatus} onValueChange={(v: any) => setInvStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberta</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="overdue">Atrasada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vencimento</Label>
                <Input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Desconto (R$)</Label>
                <Input type="number" value={invDiscount} onChange={e => setInvDiscount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Acréscimo (R$)</Label>
                <Input type="number" value={invSurcharge} onChange={e => setInvSurcharge(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={3} />
            </div>
            <Button size="sm" onClick={handleSaveInvoice}>Salvar alterações</Button>
          </div>
        )}

        <Separator />

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Itens da fatura</h3>
            <Button size="sm" variant="outline" onClick={() => { resetItemForm(); setAddingItem(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
            </Button>
          </div>

          {itemsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado</p>
          ) : (
            <div className="space-y-1.5">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                      </Badge>
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground">{item.quantity}x R$ {Number(item.unit_price).toFixed(2)}</span>
                    <p className="font-semibold text-sm">R$ {Number(item.total_price).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit item form */}
          {addingItem && (
            <div className="border rounded-lg p-3 mt-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{editingItem ? "Editar item" : "Novo item"}</h4>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setAddingItem(false); resetItemForm(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Nome do serviço *</Label>
                  <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: Post Instagram" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Detalhes do serviço" />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={itemCategory} onValueChange={setItemCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={itemDate} onChange={e => setItemDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} min="1" />
                </div>
                <div>
                  <Label className="text-xs">Valor unitário</Label>
                  <Input type="number" value={itemUnitPrice} onChange={e => setItemUnitPrice(e.target.value)} step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observação</Label>
                <Input value={itemNotes} onChange={e => setItemNotes(e.target.value)} />
              </div>
              <Button size="sm" onClick={handleSaveItem} disabled={savingItem || !itemName}>
                {savingItem ? "Salvando..." : editingItem ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          {Number(invDiscount) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Desconto</span>
              <span>- R$ {Number(invDiscount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {Number(invSurcharge) > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Acréscimo</span>
              <span>+ R$ {Number(invSurcharge).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-1">Observações</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* NF Attachments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" /> Nota Fiscal
            </h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUploadNF}
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploading ? "Enviando..." : "Anexar PDF"}
              </Button>
            </div>
          </div>

          {attachments.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4" />
              Nota fiscal pendente
            </div>
          ) : (
            <div className="space-y-1.5">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{att.file_name}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                      <a href={att.file_url} download={att.file_name}>
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAttachment(att.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4" />
                Nota fiscal anexada
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
