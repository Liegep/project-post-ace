import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MediaLightboxProps {
  urls: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaLightbox({ urls, initialIndex = 0, open, onOpenChange }: MediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const prev = useCallback(() => setIndex((i) => (i - 1 + urls.length) % urls.length), [urls.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % urls.length), [urls.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, prev, next, onOpenChange]);

  // Wheel: horizontal scroll (trackpad) OR shift+wheel navigates pages.
  // Throttled so a single flick doesn't skip several images at once.
  const wheelLock = useRef(0);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (urls.length <= 1) return;
      const now = Date.now();
      if (now - wheelLock.current < 350) return;
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (Math.abs(dx) < 12) return;
      wheelLock.current = now;
      if (dx > 0) next();
      else prev();
    },
    [urls.length, prev, next]
  );

  // Touch + mouse swipe support
  const swipeState = useRef<{ startX: number; active: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (urls.length <= 1) return;
    if ((e.target as HTMLElement).closest("button")) return;
    swipeState.current = { startX: e.clientX, active: true };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!swipeState.current?.active) return;
    const dx = e.clientX - swipeState.current.startX;
    swipeState.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next();
    else prev();
  };

  if (!urls.length) return null;

  const currentUrl = urls[index];
  const isVideo = currentUrl?.match(/\.(mp4|webm|mov|avi)/i);

  const handleDownload = async () => {
    try {
      const res = await fetch(currentUrl, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const urlPath = currentUrl.split("?")[0];
      const extMatch = urlPath.match(/\.([a-z0-9]{2,5})$/i);
      const ext = extMatch ? extMatch[1] : (isVideo ? "mp4" : "jpg");
      const filename = `download-${Date.now()}.${ext}`;
      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch (e: any) {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
      toast({ title: "Abrindo em nova aba", description: "Clique com o botão direito e 'Salvar como...' para baixar." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none flex items-center justify-center [&>button]:hidden"
        onWheel={handleWheel}
      >
        <button
          onClick={handleDownload}
          className="absolute top-3 right-14 z-50 rounded-full bg-black/60 p-2 hover:bg-black/80 transition-colors"
          title="Baixar mídia"
        >
          <Download className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 rounded-full bg-black/60 p-2 hover:bg-black/80 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        <div
          className="relative flex items-center justify-center w-full h-[85vh] touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeState.current = null)}
        >
          {isVideo ? (
            <video src={currentUrl} controls className="max-w-full max-h-full object-contain" />
          ) : (
            <img
              src={currentUrl}
              alt=""
              draggable={false}
              className="max-w-full max-h-full object-contain select-none pointer-events-none"
            />
          )}

          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Anterior"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-40 rounded-full bg-black/70 hover:bg-black p-3 md:p-3.5 shadow-lg ring-1 ring-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 md:h-7 md:w-7 text-white" strokeWidth={2.5} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Próximo"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-40 rounded-full bg-black/70 hover:bg-black p-3 md:p-3.5 shadow-lg ring-1 ring-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6 md:h-7 md:w-7 text-white" strokeWidth={2.5} />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
                <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
                  {index + 1} / {urls.length}
                </span>
                <div className="flex gap-1.5">
                  {urls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      aria-label={`Ir para mídia ${i + 1}`}
                      className={`h-2.5 rounded-full transition-all ${i === index ? "bg-white w-6" : "bg-white/40 hover:bg-white/70 w-2.5"}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
