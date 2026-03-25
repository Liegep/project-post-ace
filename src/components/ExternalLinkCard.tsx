import { ExternalLink, Film, FileText } from "lucide-react";
import { detectExternalVideo, getPlatformLabel } from "@/lib/videoEmbed";

interface ExternalLinkCardProps {
  url: string;
  className?: string;
}

export function ExternalLinkCard({ url, className = "" }: ExternalLinkCardProps) {
  const video = detectExternalVideo(url);
  const isVideo = !!video;
  const label = video ? `Assistir vídeo — ${getPlatformLabel(video.type)}` : "Abrir arquivo";
  const Icon = isVideo ? Film : FileText;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, "_blank", "noopener");
  };

  return (
    <button
      onClick={handleClick}
      className={`group/link flex items-center gap-3 w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-left transition-all hover:bg-accent hover:border-accent hover:shadow-sm ${className}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/link:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground group-hover/link:underline underline-offset-2 truncate block">
          {label}
        </span>
        <span className="text-xs text-muted-foreground truncate block">{url}</span>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
    </button>
  );
}

export function isExternalLink(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ["drive.google.com", "youtube.com", "youtu.be", "vimeo.com", "www.youtube.com", "www.vimeo.com"].some(d => u.hostname.includes(d));
  } catch {
    return false;
  }
}
