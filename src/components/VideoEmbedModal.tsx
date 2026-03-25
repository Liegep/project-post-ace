import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { VideoInfo } from "@/lib/videoEmbed";
import { getPlatformLabel } from "@/lib/videoEmbed";

interface VideoEmbedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: VideoInfo;
}

export function VideoEmbedModal({ open, onOpenChange, video }: VideoEmbedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black/95 border-none rounded-2xl">
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          {open && (
            <iframe
              src={video.embedUrl}
              className="absolute inset-0 w-full h-full rounded-2xl"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              title={`Vídeo ${getPlatformLabel(video.type)}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
