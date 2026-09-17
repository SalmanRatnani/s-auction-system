import Link from "next/link";

export function Logo({
  href = "/dashboard",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-6 w-6 text-[12px]" : "h-7 w-7 text-[13px]";
  const text = size === "sm" ? "text-[13px]" : "text-sm";

  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <span
        className={`${box} grid place-items-center rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-bold tracking-tight transition-transform duration-150 group-hover:scale-[1.03]`}
      >
        S
      </span>
      <span className={`${text} font-semibold tracking-tight text-[var(--fg-1)]`}>
        Auction
      </span>
    </Link>
  );
}