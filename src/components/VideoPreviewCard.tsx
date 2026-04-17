import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { VideoEmbedModal } from "./VideoEmbedModal";
import type { VideoInfo } from "@/lib/videoEmbed";
import { getPlatformLabel } from "@/lib/videoEmbed";

interface VideoPreviewCardProps {
  video: VideoInfo;
  originalUrl: string;
  className?: string;
}

export function VideoPreviewCard({ video, originalUrl, className = "" }: VideoPreviewCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const hasThumbnail = video.thumbnailUrl && !thumbError;
  // Drive blocks iframe embeds → always open in new tab. YouTube/Vimeo can embed.
  const forceNewTab = video.type === "drive";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (forceNewTab) return; // <a> handles navigation
    setModalOpen(true);
  };

  const Wrapper: any = forceNewTab ? "a" : "div";
  const wrapperProps = forceNewTab
    ? {
        href: originalUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        referrerPolicy: "no-referrer" as const,
      }
    : {};

  return (
    <>
      <Wrapper
        {...wrapperProps}
        className={`relative w-full overflow-hidden rounded-xl cursor-pointer group block no-underline ${className}`}
        style={{ aspectRatio: "16/9" }}
        onClick={handleClick}
      >
        {/* Background */}
        {hasThumbnail ? (
          <img
            src={video.thumbnailUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setThumbError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/60 flex flex-col items-center justify-center gap-2">
            <Play className="h-8 w-8 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground/80 font-medium">Clique para assistir</span>
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-background/90 shadow-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <Play className="h-6 w-6 text-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Platform badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
            {getPlatformLabel(video.type)}
          </span>
        </div>

        {/* External link indicator */}
        <div
          className="absolute top-2.5 right-2.5 rounded-md bg-background/80 backdrop-blur-sm p-1.5 text-foreground shadow-sm"
          title="Abrir em nova aba"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      </Wrapper>

      <VideoEmbedModal open={modalOpen} onOpenChange={setModalOpen} video={video} />
    </>
  );
}
