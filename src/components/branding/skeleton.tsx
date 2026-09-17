import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  rounded = "md",
}: {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}) {
  const r =
    rounded === "full"
      ? "rounded-full"
      : rounded === "lg"
      ? "rounded-2xl"
      : rounded === "sm"
      ? "rounded-md"
      : "rounded-xl";
  return <div className={cn("shimmer", r, className)} />;
}

export function SkeletonCard() {
  return (
    <div className="surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-10 w-10" rounded="full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-12" rounded="full" />
        </div>
      ))}
    </div>
  );
}