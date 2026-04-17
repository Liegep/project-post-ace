import { cn } from "@/lib/utils";

interface GradientHeartIconProps {
  className?: string;
}

/**
 * Heart icon filled with the site's signature gradient
 * (cyan → blue → purple, matching --gradient-start/mid/end).
 */
export function GradientHeartIcon({ className }: GradientHeartIconProps) {
  // Unique id keeps multiple instances from clashing in the DOM
  const gradientId = "gradient-heart-fill";

  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--gradient-start))" />
          <stop offset="50%" stopColor="hsl(var(--gradient-mid))" />
          <stop offset="100%" stopColor="hsl(var(--gradient-end))" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M12 21s-7.5-4.5-9.6-9.3C1 7.5 4 4 7.5 4c1.9 0 3.5 1 4.5 2.5C13 5 14.6 4 16.5 4 20 4 23 7.5 21.6 11.7 19.5 16.5 12 21 12 21z"
      />
    </svg>
  );
}
