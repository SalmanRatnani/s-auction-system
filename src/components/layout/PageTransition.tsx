"use client";

export function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`animate-slide-up ${className}`}>{children}</div>
  );
}