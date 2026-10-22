"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const COLORS = [
  "#d5f65b",
  "#93c5fd",
  "#fca5a5",
  "#c4b5fd",
  "#5eead4",
  "#fdba74",
];
export function TeamLogo({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hash = Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "T";
  return (
    <span
      className={cn("team-emblem", className)}
      style={{ color: COLORS[hash % COLORS.length] }}
    >
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={`${name} logo`}
          onError={() => setFailedSrc(src)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg viewBox="0 0 64 64" role="img" aria-label={`${name} team crest`}>
          <path
            d="M32 3 57 13v20c0 13-13 23-25 28C20 56 7 46 7 33V13L32 3Z"
            fill="currentColor"
            fillOpacity=".1"
            stroke="currentColor"
            strokeOpacity=".65"
            strokeWidth="1.5"
          />
          <path
            d="m21 15 11-4 11 4M22 49l10 6 10-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x="32"
            y="38"
            textAnchor="middle"
            fill="currentColor"
            fontSize="19"
            fontWeight="800"
            fontFamily="Arial,sans-serif"
          >
            {initials}
          </text>
        </svg>
      )}
    </span>
  );
}
