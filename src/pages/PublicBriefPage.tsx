import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { getTemplate } from "@/lib/briefTemplates";
import { tLabel, tOptions, tMeta, tUI, briefLocaleNames, type BriefLocale } from "@/lib/briefTranslations";
import {
  ExternalLink, Globe, FileText, Loader2, ShieldAlert,
  Save, Upload, X, Link as LinkIcon, CheckCircle2, User, Mail,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BriefData {
  id: string;
  title: string;
  category: string;
  answers: Record<string, any>;
  locale: string;
  respondent_name: string;
  respondent_email: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function PublicBriefPage() {
  const { token } = useParams<{ token: string }>();
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      const { data: tokenData, error: tokenErr } = await supabase
        .from("design_brief_tokens")
        .select("brief_id, active, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (tokenErr || !tokenData) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (!tokenData.active || (tokenData.expires_at && new Date(tokenData.expires_at) < new Date())) {
        setError("Este link expirou.");
        setLoading(false);
        return;
      }

      const { data: briefData, error: briefErr } = await supabase
        .from("design_briefs")
        .select("id, title, category, answers, locale, respondent_name, respondent_email, submitted_at, created_at, updated_at")
        .eq("id", tokenData.brief_id)
        .maybeSingle();

      if (briefErr || !briefData) {
        setError("Brief não encontrado.");
        setLoading(false);
        return;
      }

      const parsedAnswers = (typeof briefData.answers === "object" && briefData.answers)
        ? briefData.answers as Record<string, any>
        : {};

      setBrief({
        ...briefData,
        answers: parsedAnswers,
        respondent_name: (briefData as any).respondent_name || "",
        respondent_email: (briefData as any).respondent_email || "",
        submitted_at: (briefData as any).submitted_at || null,
      });
      setAnswers(parsedAnswers);
      setRespondentName((briefData as any).respondent_name || "");
      setRespondentEmail((briefData as any).respondent_email || "");
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive/50" />
          <p className="text-lg font-medium text-foreground">{error || "Erro ao carregar brief."}</p>
        </div>
      </div>
    );
  }

  const template = getTemplate(brief.category);
  const questions = template?.questions || [];
  const locale = (brief.locale || "pt") as BriefLocale;
  const templateName = (template && tMeta(template.id, "name", locale)) || template?.name || brief.category;

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckbox = (questionId: string, option: string) => {
    const current: string[] = answers[questionId] || [];
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option];
    updateAnswer(questionId, updated);
  };

  const getLabel = (questionId: string, defaultLabel: string) => {
    return tLabel(template!.id, questionId, locale) || defaultLabel;
  };

  const getOpts = (questionId: string, defaultOptions?: string[]) => {
    return tOptions(template!.id, questionId, locale) || defaultOptions;
  };

  const handleFileUpload = async (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(prev => ({ ...prev, [questionId]: true }));

    const currentFiles: string[] = answers[questionId] || [];
    const newFiles = [...currentFiles];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede 20MB`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `briefs/public/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) {
        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      } else {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        newFiles.push(urlData.publicUrl);
      }
    }

    updateAnswer(questionId, newFiles);
    setUploading(prev => ({ ...prev, [questionId]: false }));
  };

  const removeFile = (questionId: string, index: number) => {
    const current: string[] = answers[questionId] || [];
    updateAnswer(questionId, current.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!respondentName.trim() || !respondentEmail.trim()) {
      toast({ title: "Preencha seu nome e e-mail", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(respondentEmail.trim())) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("design_briefs")
      .update({
        answers: answers as any,
        respondent_name: respondentName.trim(),
        respondent_email: respondentEmail.trim(),
        submitted_at: new Date().toISOString(),
      })
      .eq("id", brief.id);

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Brief enviado com sucesso!" });
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          <h2 className="text-2xl font-bold text-foreground">Brief enviado!</h2>
          <p className="text-muted-foreground">
            Obrigado, {respondentName}! Suas respostas foram salvas com sucesso.
            Você pode voltar a este link para editar suas respostas enquanto ele estiver ativo.
          </p>
        </div>
      </div>
    );
  }

  const hasRequired = questions
    .filter(q => q.required)
    .every(q => {
      const val = answers[q.id];
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== null;
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="rounded-2xl border border-border bg-card shadow-xl p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{brief.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{templateName}</Badge>
              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {briefLocaleNames[locale] || locale}
              </Badge>
            </div>
            {brief.submitted_at && (
              <p className="text-xs text-muted-foreground">
                Última resposta em {format(new Date(brief.submitted_at), "dd/MM/yyyy 'às' HH:mm")}
                {brief.respondent_name && ` por ${brief.respondent_name}`}
              </p>
            )}
          </div>

          {/* Identification */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Identificação
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={respondentName}
                  onChange={e => setRespondentName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> E-mail <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={respondentEmail}
                  onChange={e => setRespondentEmail(e.target.value)}
                  placeholder="seu@email.com"
                  type="email"
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          {/* Form questions */}
          <div className="space-y-4">
            {questions.map(q => {
              const label = getLabel(q.id, q.label);
              const questionOptions = getOpts(q.id, q.options);

              return (
                <div key={q.id} className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label} {q.required && <span className="text-destructive">*</span>}
                  </Label>

                  {q.type === "short_text" && (
                    <Input
                      value={answers[q.id] || ""}
                      onChange={e => updateAnswer(q.id, e.target.value)}
                      className="bg-background"
                    />
                  )}

                  {q.type === "long_text" && (
                    <Textarea
                      value={answers[q.id] || ""}
                      onChange={e => updateAnswer(q.id, e.target.value)}
                      rows={3}
                      className="bg-background"
                    />
                  )}

                  {q.type === "link" && (
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={answers[q.id] || ""}
                        onChange={e => updateAnswer(q.id, e.target.value)}
                        placeholder="https://..."
                        className="pl-10 bg-background"
                      />
                    </div>
                  )}

                  {q.type === "yes_no" && (
                    <div className="flex items-center gap-3 py-1">
                      <Switch
                        checked={answers[q.id] === true}
                        onCheckedChange={val => updateAnswer(q.id, val)}
                      />
                      <span className="text-sm text-foreground">
                        {answers[q.id] === true
                          ? tUI('yes', locale)
                          : answers[q.id] === false
                            ? tUI('no', locale)
                            : tUI('not_informed', locale)}
                      </span>
                    </div>
                  )}

                  {q.type === "multiple_choice" && questionOptions && (
                    <Select
                      value={answers[q.id] || ""}
                      onValueChange={val => updateAnswer(q.id, val)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={tUI('select_option', locale)} />
                      </SelectTrigger>
                      <SelectContent>
                        {questionOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {q.type === "checkbox" && questionOptions && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {questionOptions.map(opt => {
                        const checked = (answers[q.id] || []).includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm ${
                              checked
                                ? "border-primary/40 bg-primary/10 text-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-primary/20"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleCheckbox(q.id, opt)}
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "file_upload" && (
                    <div className="space-y-2">
                      <div
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => fileInputRefs.current[q.id]?.click()}
                      >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {uploading[q.id] ? tUI('uploading', locale) : tUI('upload_hint', locale)}
                        </span>
                        <input
                          ref={el => { fileInputRefs.current[q.id] = el; }}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={e => handleFileUpload(q.id, e.target.files)}
                        />
                      </div>
                      {(answers[q.id] || []).length > 0 && (
                        <div className="space-y-1">
                          {(answers[q.id] as string[]).map((url, idx) => {
                            const fileName = decodeURIComponent(url.split("/").pop() || "arquivo");
                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary truncate flex-1 hover:underline">
                                  {fileName}
                                </a>
                                <button onClick={() => removeFile(q.id, idx)} className="text-muted-foreground hover:text-destructive">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !respondentName.trim() || !respondentEmail.trim() || !hasRequired}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enviando..." : brief.submitted_at ? "Atualizar respostas" : "Enviar brief"}
          </Button>

          <div className="pt-2 border-t border-border text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Brief compartilhado via link seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
