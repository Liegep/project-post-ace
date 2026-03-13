import { useState } from "react";
import { Tag, TAG_TRANSLATION_KEYS } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check } from "lucide-react";

const useTagName = (tag: Tag) => {
  const { t } = useI18n();
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
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const toggleTag = (tagId: string) => {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const tag = addTag(newName.trim(), newColor);
    onChange([...selectedTagIds, tag.id]);
    setNewName("");
    setNewColor("#6366f1");
    setCreateOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border"
              style={{
                backgroundColor: selected ? tag.color : "transparent",
                borderColor: tag.color,
                color: selected ? "#fff" : tag.color,
              }}
            >
              {selected && <Check className="h-3 w-3" />}
              {tag.name}
            </button>
          );
        })}

        <Popover open={createOpen} onOpenChange={setCreateOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Plus className="h-3 w-3" /> {t("newTag")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" align="start">
            <p className="text-sm font-medium text-foreground">{t("createTag")}</p>
            <Input
              placeholder={t("tagNamePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">{t("color")}:</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-xs text-muted-foreground">{newColor}</span>
            </div>
            <Button size="sm" onClick={handleCreate} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {t("create")}
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

interface TagDisplayProps {
  tagIds: string[];
  tags: Tag[];
}

export const TagDisplay = ({ tagIds, tags }: TagDisplayProps) => {
  if (tagIds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tagIds.map((id) => {
        const tag = tags.find((t) => t.id === id);
        if (!tag) return null;
        return (
          <span
            key={id}
            className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: tag.color, color: "#fff" }}
          >
            {tag.name}
          </span>
        );
      })}
    </div>
  );
};
