import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Upload, X, Link as LinkIcon, Globe, Eye, User, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { BriefTemplate } from "@/lib/briefTemplates";
import { tLabel, tOptions, tMeta, tUI, briefLocaleNames, type BriefLocale } from "@/lib/briefTranslations";

interface BriefFormProps {
  template: BriefTemplate;
  initialAnswers?: Record<string, any>;
  initialTitle?: string;
  initialLocale?: BriefLocale;
  saving: boolean;
  onSave: (title: string, answers: Record<string, any>, locale: BriefLocale) => void;
}

export default function BriefForm({ template, initialAnswers = {}, initialTitle = "", initialLocale = "pt", saving, onSave }: BriefFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [title, setTitle] = useState(initialTitle);
  const [locale, setLocale] = useState<BriefLocale>(initialLocale);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getLabel = (questionId: string, defaultLabel: string) => {
    return tLabel(template.id, questionId, locale) || defaultLabel;
  };

  const getOpts = (questionId: string, defaultOptions?: string[]) => {
    return tOptions(template.id, questionId, locale) || defaultOptions;
  };

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

  const handleFileUpload = async (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(prev => ({ ...prev, [questionId]: true }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(prev => ({ ...prev, [questionId]: false })); return; }

    const currentFiles: string[] = answers[questionId] || [];
    const newFiles = [...currentFiles];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede 20MB`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `briefs/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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

  const handleSubmit = () => {
    const autoTitle = template.isBase
      ? `Briefing Geral${answers.company_name ? ` - ${answers.company_name}` : ""}`
      : title || `${template.name} - ${new Date().toLocaleDateString("pt-BR")}`;
    onSave(autoTitle, answers, locale);
  };

  const hasRequired = template.questions
    .filter(q => q.required)
    .every(q => {
      const val = answers[q.id];
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== null;
    });

  return (
    <div className="space-y-6">
      {/* Language selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          {tUI('brief_language', locale)}
        </Label>
        <Select value={locale} onValueChange={val => setLocale(val as BriefLocale)}>
          <SelectTrigger className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(briefLocaleNames) as [BriefLocale, string][]).map(([code, name]) => (
              <SelectItem key={code} value={code}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!template.isBase && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tUI('title_placeholder', locale)}
          </Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`Ex: ${template.name} - Cliente X`}
            className="bg-white text-black placeholder:text-black/40 border-white/30"
          />
        </div>
      )}

      {template.questions.map(q => {
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
                className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
              />
            )}

            {q.type === "long_text" && (
              <Textarea
                value={answers[q.id] || ""}
                onChange={e => updateAnswer(q.id, e.target.value)}
                rows={3}
                className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
              />
            )}

            {q.type === "link" && (
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={answers[q.id] || ""}
                  onChange={e => updateAnswer(q.id, e.target.value)}
                  placeholder="https://..."
                  className="pl-10 bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
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
                <SelectTrigger className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm">
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
                          : "border-white/20 bg-white/30 dark:bg-white/5 text-muted-foreground hover:border-white/40"
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
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/30 rounded-xl bg-white/20 dark:bg-white/5 cursor-pointer hover:border-primary/40 transition-colors"
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
                        <div key={idx} className="flex items-center gap-2 text-xs bg-white/30 dark:bg-white/5 rounded-lg px-3 py-2">
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

      <Button
        onClick={handleSubmit}
        disabled={saving || (!template.isBase && !title.trim()) || !hasRequired}
        className="w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] text-white hover:opacity-90"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? tUI('saving', locale) : tUI('save', locale)}
      </Button>
    </div>
  );
}
