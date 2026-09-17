import Link from "next/link";

export function Logo({
  href = "/dashboard",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const text = size === "sm" ? "text-[13px]" : "text-sm";

  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <svg
        viewBox="0 0 32 32"
        className={`${box} shrink-0 rounded-md transition-transform duration-150 group-hover:scale-[1.04]`}
        aria-hidden
      >
        <rect width="32" height="32" rx="7" fill="#0F5132" />
        <text
          x="16"
          y="23"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="20"
          fontWeight="900"
          fill="#C9A227"
          letterSpacing="-0.5"
        >
          S
        </text>
        <text
          x="16"
          y="22.6"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="19"
          fontWeight="900"
          fill="#F4EFE0"
          letterSpacing="-0.5"
        >
          S
        </text>
        <circle cx="16" cy="7" r="1.6" fill="#F4EFE0" />
      </svg>
      <span className={`${text} font-semibold tracking-tight text-[var(--fg-1)]`}>
        Auction
      </span>
    </Link>
  );
}