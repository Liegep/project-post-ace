import React from "react";
import { ExternalLink, Film, FileText } from "lucide-react";
import { detectExternalVideo, getPlatformLabel } from "@/lib/videoEmbed";

const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

const DOMAIN_LABELS: Record<string, string> = {
  "drive.google.com": "Google Drive",
  "docs.google.com": "Google Docs",
  "sheets.google.com": "Google Sheets",
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "vimeo.com": "Vimeo",
  "www.vimeo.com": "Vimeo",
  "dropbox.com": "Dropbox",
  "www.dropbox.com": "Dropbox",
  "figma.com": "Figma",
  "www.figma.com": "Figma",
  "canva.com": "Canva",
  "www.canva.com": "Canva",
  "notion.so": "Notion",
  "trello.com": "Trello",
};

function getDomainLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (DOMAIN_LABELS[hostname]) return DOMAIN_LABELS[hostname];
    // Strip www. and use capitalized domain name
    const clean = hostname.replace(/^www\./, "");
    const parts = clean.split(".");
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return "Link";
  }
}

function getFriendlyLabel(url: string): { label: string; icon: "video" | "file" } {
  const video = detectExternalVideo(url);
  const domain = getDomainLabel(url);
  if (video) {
    return { label: `Assistir vídeo (${domain})`, icon: "video" };
  }
  return { label: `Abrir arquivo (${domain})`, icon: "file" };
}

interface LinkedTextProps {
  text: string;
  className?: string;
}

export function LinkedText({ text, className = "" }: LinkedTextProps) {
  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          // Reset regex lastIndex
          URL_REGEX.lastIndex = 0;
          const { label, icon } = getFriendlyLabel(part);
          const Icon = icon === "video" ? Film : FileText;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline underline-offset-2 transition-colors hover:text-primary/80"
              title={part}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 inline" />
              {label}
              <ExternalLink className="h-3 w-3 shrink-0 inline opacity-60" />
            </a>
          );
        }
        // Reset regex lastIndex for next test
        URL_REGEX.lastIndex = 0;
        return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
      })}
    </span>
  );
}
