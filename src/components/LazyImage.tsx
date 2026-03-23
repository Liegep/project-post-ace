import { useState, useRef, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Max render width for optimization (default 600) */
  maxWidth?: number;
}

/**
 * Appends Supabase Storage image transform params to resize on the server.
 * Only applies to URLs from our own Supabase storage buckets.
 */
function optimizedSrc(src: string, maxWidth: number): string {
  if (!src) return src;
  // Only transform Supabase storage public URLs
  if (!src.includes("/storage/v1/object/public/")) return src;
  // Don't transform videos or SVGs
  if (/\.(mp4|mov|webm|svg)(\?|$)/i.test(src)) return src;
  // Append render/image transform params
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}width=${maxWidth}&quality=75`;
}

export const LazyImage = ({ src, alt, className = "", maxWidth = 600 }: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displaySrc = useMemo(() => optimizedSrc(src, maxWidth), [src, maxWidth]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {!loaded && <Skeleton className="absolute inset-0 w-full h-full" />}
      {inView && (
        <img
          src={displaySrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

export const LazyVideo = ({ src, className = "" }: { src: string; className?: string }) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {!inView && <Skeleton className="absolute inset-0 w-full h-full" />}
      {inView && <video src={src} className={className} controls muted preload="metadata" />}
    </div>
  );
};
