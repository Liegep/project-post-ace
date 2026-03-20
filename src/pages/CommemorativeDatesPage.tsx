import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCommemorativeDates, CATEGORY_LABELS, CommemorativeDate } from "@/hooks/useCommemorativeDates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, Search, CalendarHeart, X, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import UserProfileMenu from "@/components/UserProfileMenu";
import { MobileNav } from "@/components/MobileNav";
import { useUserRole } from "@/hooks/useUserRole";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CATEGORIES = [
  { value: "feriado", label: "Feriado" },
  { value: "cultural", label: "Cultural" },
  { value: "comercial", label: "Comercial" },
  { value: "sazonal", label: "Sazonal" },
];

export default function CommemorativeDatesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const {
    filteredDates,
    countries,
    loading,
    selectedCountries,
    selectedCategory,
    searchQuery,
    favoriteCountries,
    setSelectedCategory,
    setSearchQuery,
    toggleCountry,
    toggleFavorite,
    setSelectedCountries,
    refetch,
  } = useCommemorativeDates();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommemorativeDate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("");
  const [formCountryColor, setFormCountryColor] = useState("#3b82f6");
  const [formMonth, setFormMonth] = useState(1);
  const [formDay, setFormDay] = useState(1);
  const [formCategory, setFormCategory] = useState("cultural");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormCountry("");
    setFormCountryCode("");
    setFormCountryColor("#3b82f6");
    setFormMonth(1);
    setFormDay(1);
    setFormCategory("cultural");
    setFormDescription("");
    setDialogOpen(true);
  };

  const openEdit = (d: CommemorativeDate) => {
    setEditing(d);
    setFormName(d.name);
    setFormCountry(d.country);
    setFormCountryCode(d.country_code);
    setFormCountryColor(d.country_color);
    setFormMonth(d.date_month);
    setFormDay(d.date_day);
    setFormCategory(d.category);
    setFormDescription(d.description);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCountry.trim()) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      country: formCountry.trim(),
      country_code: formCountryCode.trim().toUpperCase(),
      country_color: formCountryColor,
      date_month: formMonth,
      date_day: formDay,
      category: formCategory,
      description: formDescription.trim(),
    };

    if (editing) {
      const { error } = await supabase.from("commemorative_dates").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Data atualizada!" });
      }
    } else {
      const { error } = await supabase.from("commemorative_dates").insert(payload);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Data criada!" });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("commemorative_dates").delete().eq("id", deleteId);
    toast({ title: "Data removida" });
    setDeleteId(null);
    refetch();
  };

  const displayDates = filterMonth !== "all"
    ? filteredDates.filter((d) => d.date_month === parseInt(filterMonth))
    : filteredDates;

  // Group by month
  const grouped = displayDates.reduce<Record<number, CommemorativeDate[]>>((acc, d) => {
    if (!acc[d.date_month]) acc[d.date_month] = [];
    acc[d.date_month].push(d);
    return acc;
  }, {});

  const sortedMonths = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <MobileNav title="Datas Comemorativas" />
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CalendarHeart className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
          <h1 className="text-base md:text-xl font-bold text-foreground truncate">Datas Comemorativas</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
          )}
          <UserProfileMenu />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 md:px-6 py-4 md:py-6 space-y-4">
        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar país ou data comemorativa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {MONTH_NAMES[i + 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Country filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {countries.map((c) => (
              <button
                key={c.name}
                onClick={() => toggleCountry(c.name)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                  selectedCountries.includes(c.name)
                    ? "border-transparent text-white shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
                style={
                  selectedCountries.includes(c.name)
                    ? { backgroundColor: c.color }
                    : undefined
                }
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
            {selectedCountries.length > 0 && (
              <button
                onClick={() => setSelectedCountries([])}
                className="text-xs text-muted-foreground hover:text-foreground underline px-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Dates by month */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : sortedMonths.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarHeart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma data encontrada</p>
          </div>
        ) : (
          sortedMonths.map((month) => (
            <div key={month}>
              <h2 className="text-sm font-bold text-foreground mb-2 sticky top-0 bg-background py-1 z-10">
                {MONTH_NAMES[month]}
              </h2>
              <div className="space-y-1">
                {grouped[month]
                  .sort((a, b) => a.date_day - b.date_day)
                  .map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                    >
                      {/* Day */}
                      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-muted shrink-0">
                        <span className="text-lg font-bold text-foreground leading-tight">{d.date_day}</span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{d.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 text-white"
                            style={{ backgroundColor: d.country_color }}
                          >
                            {d.country}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {CATEGORY_LABELS[d.category] || d.category}
                          </Badge>
                        </div>
                        {d.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{d.description}</p>
                        )}
                      </div>
                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(d.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Data" : "Nova Data Comemorativa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Dia das Mães" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">País</Label>
                <Input value={formCountry} onChange={(e) => setFormCountry(e.target.value)} placeholder="Ex: Brasil" />
              </div>
              <div>
                <Label className="text-xs">Código (2 letras)</Label>
                <Input value={formCountryCode} onChange={(e) => setFormCountryCode(e.target.value)} placeholder="BR" maxLength={4} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cor do País</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formCountryColor}
                    onChange={(e) => setFormCountryColor(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input value={formCountryColor} onChange={(e) => setFormCountryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mês</Label>
                <Select value={String(formMonth)} onValueChange={(v) => setFormMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{MONTH_NAMES[i + 1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Dia</Label>
                <Input type="number" min={1} max={31} value={formDay} onChange={(e) => setFormDay(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Breve descrição" />
            </div>
            <Button onClick={handleSave} disabled={!formName.trim() || !formCountry.trim() || saving} className="w-full">
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir data comemorativa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
