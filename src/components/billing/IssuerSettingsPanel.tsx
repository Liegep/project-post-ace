import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";
import { useIssuerDetails, saveIssuerDetails, IssuerDetails } from "@/hooks/useIssuerDetails";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IssuerSettingsPanel({ open, onOpenChange }: Props) {
  const { issuer, loading, refetch } = useIssuerDetails();
  const [form, setForm] = useState<IssuerDetails>(issuer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(issuer);
  }, [open, issuer]);

  const update = (k: keyof IssuerDetails, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveIssuerDetails(form);
      toast({ title: "Dados da empresa salvos" });
      await refetch();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5" /> Dados da Empresa (Emissor)
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Estes dados aparecem em todas as faturas geradas em PDF.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do negócio *</Label>
                <Input value={form.business_name} onChange={e => update("business_name", e.target.value)} placeholder="Liege Studio" />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="contato@..." />
              </div>
            </div>

            <div>
              <Label className="text-xs">Endereço</Label>
              <Textarea rows={2} value={form.address} onChange={e => update("address", e.target.value)} placeholder="Rua, número, bairro, cidade, CEP" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">País</Label>
                <Input value={form.country} onChange={e => update("country", e.target.value)} placeholder="Brasil" />
              </div>
              <div>
                <Label className="text-xs">Tax ID / VAT / CNPJ</Label>
                <Input value={form.tax_id} onChange={e => update("tax_id", e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-2 text-white">Pagamento padrão</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Forma de pagamento padrão</Label>
                  <Input value={form.payment_method} onChange={e => update("payment_method", e.target.value)} placeholder="Transferência bancária / Pix / PayPal" />
                </div>
                <div>
                  <Label className="text-xs">Detalhes de pagamento</Label>
                  <Textarea rows={3} value={form.payment_details} onChange={e => update("payment_details", e.target.value)} placeholder="IBAN: ...&#10;Banco: ...&#10;PayPal: ..." />
                  <p className="text-[11px] text-muted-foreground mt-1">IBAN, conta, chave Pix, e-mail PayPal etc.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.business_name}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
