export function Loader({
  label = "Loading",
  fullScreen = false,
  compact = false,
}: {
  label?: string;
  fullScreen?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className="inline-block h-4 w-4 rounded-full border-[1.5px] border-[var(--fg-3)] border-t-transparent animate-spin-slow" />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullScreen ? "min-h-screen" : "min-h-[40vh]"
      }`}
    >
      <span className="h-6 w-6 rounded-full border-2 border-[var(--line-3)] border-t-[var(--accent)] animate-spin-slow" />
      <span className="text-[13px] text-[var(--fg-3)]">{label}</span>
    </div>
  );
}