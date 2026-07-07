import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Paintbrush, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
  "#000000", // black
];

interface Props {
  value?: string | null;
  onChange: (color: string | null) => void;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  compact?: boolean;
}

export function EventColorPicker({ value, onChange, align = "start", triggerClassName, compact }: Props) {
  const [custom, setCustom] = useState(value || "#3b82f6");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors",
            compact && "px-1.5 py-1",
            triggerClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="h-3.5 w-3.5 rounded-full border border-zinc-300 shrink-0"
            style={{ backgroundColor: value || "transparent", backgroundImage: value ? undefined : "linear-gradient(45deg, #e4e4e7 25%, transparent 25%, transparent 75%, #e4e4e7 75%), linear-gradient(45deg, #e4e4e7 25%, transparent 25%, transparent 75%, #e4e4e7 75%)", backgroundSize: "6px 6px", backgroundPosition: "0 0, 3px 3px" }}
          />
          {!compact && <Paintbrush className="h-3 w-3" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-56 p-3 z-[9999]" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-semibold text-zinc-900 mb-2">Cor do evento</div>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                value === c ? "border-zinc-900 ring-2 ring-zinc-900/20" : "border-white shadow"
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="color"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              onChange(e.target.value);
            }}
            className="h-8 w-10 p-0.5 cursor-pointer"
          />
          <Input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => onChange(custom)}
            className="h-8 text-xs flex-1"
            placeholder="#3b82f6"
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
          >
            <X className="h-3 w-3" /> Remover cor
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
