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

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      onClick={(e) => e.stopPropagation()}
      className={`group/link flex items-center gap-3 w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-left transition-all hover:bg-accent hover:border-accent hover:shadow-sm no-underline ${className}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/link:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground group-hover/link:underline underline-offset-2 truncate flex items-center gap-1.5">
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-xs text-muted-foreground truncate block">{url}</span>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
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
