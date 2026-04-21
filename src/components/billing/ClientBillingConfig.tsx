import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Receipt, CalendarDays, DollarSign, Repeat, Pause, Play, Coins } from "lucide-react";
import { CURRENCIES, getCurrency } from "@/lib/currency";

const BILLING_TYPES = [
  { value: "manual", label: "Manual / Avulso", desc: "Faturas criadas manualmente" },
  { value: "recurring", label: "Mensal Recorrente", desc: "Fatura gerada automaticamente todo mês" },
  { value: "on_demand", label: "Sob Demanda", desc: "Faturado conforme os trabalhos realizados" },
];

interface BillingConfig {
  billing_type: string;
  billing_recurrence_active: boolean;
  billing_monthly_amount: number;
  billing_description: string;
  billing_due_day: number;
  billing_start_date: string | null;
  billing_currency: string;
  address: string;
  country: string;
  tax_id: string;
}

export function ClientBillingConfig({ clientId }: { clientId: string }) {
  const [config, setConfig] = useState<BillingConfig>({
    billing_type: "manual",
    billing_recurrence_active: false,
    billing_monthly_amount: 0,
    billing_description: "",
    billing_due_day: 10,
    billing_start_date: null,
    billing_currency: "BRL",
    address: "",
    country: "",
    tax_id: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("clients")
        .select("billing_type, billing_recurrence_active, billing_monthly_amount, billing_description, billing_due_day, billing_start_date, billing_currency, address, country, tax_id")
        .eq("id", clientId)
        .single();
      if (data) setConfig(data as any);
      setLoading(false);
    };
    load();
  }, [clientId]);

  const save = async (updates: Partial<BillingConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await supabase.from("clients").update(updates as any).eq("id", clientId);
    toast({ title: "Configuração salva" });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  const isRecurring = config.billing_type === "recurring";
  const cur = getCurrency(config.billing_currency);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faturação</p>
      </div>

      {/* Billing Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de cobrança</Label>
        <Select
          value={config.billing_type}
          onValueChange={(v) => {
            const updates: Partial<BillingConfig> = { billing_type: v };
            if (v !== "recurring") updates.billing_recurrence_active = false;
            save(updates);
          }}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BILLING_TYPES.map((bt) => (
              <SelectItem key={bt.value} value={bt.value}>
                <span className="font-medium">{bt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {BILLING_TYPES.find((bt) => bt.value === config.billing_type)?.desc}
        </p>
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Coins className="h-3 w-3" />
          Moeda
        </Label>
        <Select
          value={config.billing_currency}
          onValueChange={(v) => save({ billing_currency: v })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recurring config */}
      {isRecurring && (
        <>
          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.billing_recurrence_active ? (
                <Play className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Pause className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Label className="text-sm">Recorrência</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={config.billing_recurrence_active
                  ? "bg-emerald-500/15 text-emerald-600 text-xs"
                  : "bg-muted text-muted-foreground text-xs"
                }
              >
                {config.billing_recurrence_active ? "Ativa" : "Pausada"}
              </Badge>
              <Switch
                checked={config.billing_recurrence_active}
                onCheckedChange={(v) => save({ billing_recurrence_active: v })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" />
                Valor mensal ({cur.symbol})
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="h-9 text-sm"
                value={config.billing_monthly_amount || ""}
                onChange={(e) => save({ billing_monthly_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição da cobrança</Label>
              <Textarea
                className="text-sm min-h-[60px] resize-none"
                value={config.billing_description}
                onChange={(e) => save({ billing_description: e.target.value })}
                placeholder="Ex: Gestão de redes sociais - Mensal"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  Dia de vencimento
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  className="h-9 text-sm"
                  value={config.billing_due_day}
                  onChange={(e) => save({ billing_due_day: Math.max(1, Math.min(28, parseInt(e.target.value) || 10)) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Repeat className="h-3 w-3" />
                  Início
                </Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={config.billing_start_date || ""}
                  onChange={(e) => save({ billing_start_date: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados para Faturação</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Endereço</Label>
          <Textarea
            className="text-sm min-h-[60px] resize-none"
            value={config.address}
            onChange={(e) => save({ address: e.target.value })}
            placeholder="Rua, número, bairro, cidade, CEP"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">País</Label>
            <Input
              className="h-9 text-sm"
              value={config.country}
              onChange={(e) => save({ country: e.target.value })}
              placeholder="Brasil"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tax ID / VAT / CNPJ</Label>
            <Input
              className="h-9 text-sm"
              value={config.tax_id}
              onChange={(e) => save({ tax_id: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
