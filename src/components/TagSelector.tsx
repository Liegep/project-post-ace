import { useState, useMemo } from "react";
import { Tag, TAG_TRANSLATION_KEYS } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Tags, Plus, Search, X } from "lucide-react";

const getTagDisplayName = (tag: Tag, t: ReturnType<typeof useI18n>["t"]) => {
  const translationKey = TAG_TRANSLATION_KEYS[tag.id];
  return translationKey ? t(translationKey) : tag.name;
};

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export const TagSelector = ({ selectedTagIds, onChange }: TagSelectorProps) => {
  const { tags, addTag } = usePosts();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingTag, setSavingTag] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase().trim();
    return tags.filter((tag) => {
      const name = getTagDisplayName(tag, t).toLowerCase();
      return name.includes(q);
    });
  }, [tags, search, t]);

  const toggleTag = (tagId: string) => {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  const handleCreate = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || savingTag) return;

    const exists = tags.some(
      (tag) => getTagDisplayName(tag, t).toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) return;

    setSavingTag(true);
    try {
      const tag = await addTag(trimmedName, newColor);
      onChange([...selectedTagIds, tag.id]);
      setNewName("");
      setNewColor("#6366f1");
      setCreating(false);
    } catch (error) {
      console.error("[TagSelector] Failed to create tag", error);
      toast({
        title: "Erro ao criar etiqueta",
        description: "A etiqueta não foi salva. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingTag(false);
    }
  };

  const removeTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Applied tags - compact display */}
      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold group/tag"
           style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
        >
          {getTagDisplayName(tag, t)}
          <button
            onClick={(e) => removeTag(tag.id, e)}
            className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:bg-white/20 rounded-full p-0 leading-none"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {/* Manage tags button */}
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setCreating(false); } }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-white px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            <Tags className="h-4 w-4" />
            Tags
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start" onClick={(e) => e.stopPropagation()}>
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>

          {/* Tag list with checkboxes */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredTags.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhuma etiqueta encontrada
              </p>
            )}
            {filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted cursor-pointer transition-colors"
                >
                  <Checkbox checked={isSelected} className="h-3.5 w-3.5 pointer-events-none" />
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate text-foreground">{getTagDisplayName(tag, t)}</span>
                </button>
              );
            })}
          </div>

          {/* Create new tag */}
          <div className="border-t p-2">
            {creating ? (
              <div className="space-y-2">
                <Input
                  placeholder={t("tagNamePlaceholder") || "Nome da etiqueta"}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreate();
                    }
                  }}
                  className="h-7 text-xs"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="text-[10px] text-muted-foreground flex-1">{newColor}</span>
                  <Button size="sm" type="button" onClick={() => void handleCreate()} disabled={savingTag} className="h-6 text-[10px] px-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {savingTag ? "..." : t("create") || "Criar"}
                  </Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setCreating(false)} className="h-6 text-[10px] px-2">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("newTag") || "Criar etiqueta"}
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface TagDisplayProps {
  tagIds: string[];
  tags: Tag[];
}

export const TagDisplay = ({ tagIds, tags }: TagDisplayProps) => {
  const { t } = useI18n();
  if (tagIds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tagIds.map((id) => {
        const tag = tags.find((t) => t.id === id);
        if (!tag) return null;
        const translationKey = TAG_TRANSLATION_KEYS[tag.id];
        const displayName = translationKey ? t(translationKey) : tag.name;
        return (
          <span
            key={id}
            className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
          >
            {displayName}
          </span>
        );
      })}
    </div>
  );
};
