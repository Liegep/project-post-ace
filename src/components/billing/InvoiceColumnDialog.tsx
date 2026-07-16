import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  currency?: string;
  onConfirm: (values: { name: string; quantity: number; unit_price: number; description: string }) => Promise<void>;
}

export function InvoiceColumnDialog({ open, onOpenChange, columnName, currency, onConfirm }: Props) {
  const [name, setName] = useState(columnName);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(columnName);
      setQuantity(1);
      setUnitPrice(0);
      setDescription("");
    }
  }, [open, columnName]);

  const total = Number((quantity * unitPrice).toFixed(2));

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({ name: name.trim() || columnName, quantity, unit_price: unitPrice, description });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Revisar item da fatura
          </DialogTitle>
          <DialogDescription>
            Confirme a quantidade e o preço antes de adicionar à fatura em aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="inv-item-name">Descrição do item</Label>
            <Input
              id="inv-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={columnName}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="inv-item-qty">Quantidade</Label>
              <Input
                id="inv-item-qty"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-item-price">Preço unitário</Label>
              <Input
                id="inv-item-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="inv-item-notes">Observações (opcional)</Label>
            <Textarea
              id="inv-item-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
            Adicionar à fatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
