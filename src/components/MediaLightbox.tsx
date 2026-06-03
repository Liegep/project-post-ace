import { useState, useEffect, useCallback } from "react";
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
      // Fallback: open in new tab so the browser handles the download
      window.open(currentUrl, "_blank", "noopener,noreferrer");
      toast({ title: "Abrindo em nova aba", description: "Clique com o botão direito e 'Salvar como...' para baixar." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none flex items-center justify-center [&>button]:hidden">
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

        <div className="relative flex items-center justify-center w-full h-[85vh]">
          {isVideo ? (
            <video src={currentUrl} controls className="max-w-full max-h-full object-contain" />
          ) : (
            <img src={currentUrl} alt="" className="max-w-full max-h-full object-contain select-none" />
          )}

          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 hover:bg-black/80 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 hover:bg-black/80 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {urls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === index ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
