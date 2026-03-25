/**
 * Utilities for detecting and embedding external videos
 * Supports: YouTube, Vimeo, Google Drive
 */

export interface VideoInfo {
  type: "youtube" | "vimeo" | "gdrive";
  id: string;
  embedUrl: string;
  thumbnailUrl: string | null;
}

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(?:video\/)?(\d+)/;
const GDRIVE_REGEX = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;

export function detectExternalVideo(url: string): VideoInfo | null {
  if (!url) return null;

  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) {
    return {
      type: "youtube",
      id: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }

  const vimeoMatch = url.match(VIMEO_REGEX);
  if (vimeoMatch) {
    return {
      type: "vimeo",
      id: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      thumbnailUrl: null, // Vimeo requires API call for thumbnails
    };
  }

  const gdriveMatch = url.match(GDRIVE_REGEX);
  if (gdriveMatch) {
    return {
      type: "gdrive",
      id: gdriveMatch[1],
      embedUrl: `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${gdriveMatch[1]}&sz=w640`,
    };
  }

  return null;
}

export function isExternalVideoUrl(url: string): boolean {
  return detectExternalVideo(url) !== null;
}

export function getPlatformLabel(type: VideoInfo["type"]): string {
  switch (type) {
    case "youtube": return "YouTube";
    case "vimeo": return "Vimeo";
    case "gdrive": return "Google Drive";
  }
}
