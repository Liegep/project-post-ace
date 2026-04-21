import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, Trophy, X } from "lucide-react";

export interface TopContentItem {
  title: string;
  image_url: string;
}

export interface TopContentData {
  posts: TopContentItem[];
  reels: TopContentItem[];
  stories: TopContentItem[];
}

export const EMPTY_TOP_CONTENT: TopContentData = {
  posts: [
    { title: "", image_url: "" },
    { title: "", image_url: "" },
    { title: "", image_url: "" },
  ],
  reels: [
    { title: "", image_url: "" },
    { title: "", image_url: "" },
    { title: "", image_url: "" },
  ],
  stories: [
    { title: "", image_url: "" },
    { title: "", image_url: "" },
    { title: "", image_url: "" },
  ],
};

interface Props {
  value: TopContentData;
  onChange: (next: TopContentData) => void;
}

const SECTION_LABELS: Record<keyof TopContentData, string> = {
  posts: "Top 3 Posts",
  reels: "Top 3 Reels",
  stories: "Top 3 Stories",
};

export function TopContentPanel({ value, onChange }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);

  const updateItem = (
    section: keyof TopContentData,
    index: number,
    patch: Partial<TopContentItem>,
  ) => {
    const next = { ...value };
    next[section] = next[section].map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange(next);
  };

  const handleUpload = async (
    section: keyof TopContentData,
    index: number,
    file: File,
  ) => {
    const key = `${section}-${index}`;
    setUploading(key);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `social-reports/${Date.now()}-${section}-${index}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      updateItem(section, index, { image_url: pub.publicUrl });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Conteúdos com mais resultados no período
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.keys(value) as (keyof TopContentData)[]).map((section) => (
          <div key={section} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {SECTION_LABELS[section]}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {value[section].map((item, idx) => {
                const key = `${section}-${idx}`;
                const isUploading = uploading === key;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/50 bg-background/40 p-2 space-y-2"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-muted/40 flex items-center justify-center">
                      {item.image_url ? (
                        <>
                          <img
                            src={item.image_url}
                            alt={item.title || `${section} ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(section, idx, { image_url: "" })}
                            className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background"
                            aria-label="Remover imagem"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <label className="flex flex-col items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-3 text-center">
                          {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ImagePlus className="h-5 w-5" />
                          )}
                          <span className="text-[10px]">
                            {isUploading ? "Enviando..." : "Adicionar print"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(section, idx, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Título #{idx + 1}
                      </Label>
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          updateItem(section, idx, { title: e.target.value })
                        }
                        placeholder="Ex: Lançamento da coleção"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
