import Link from "next/link";

/** Path-only artwork stays crisp and identical in the app, favicon and exports. */
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="13" fill="#D5F65B" />
      <path
        d="M32 11H20L10 24h16l-5 7H11l-4 6h15l11-15H17l4-5h7l4-6Z"
        fill="#101820"
      />
      <path d="m35 11-5 7h7l5-7h-7Z" fill="#101820" />
    </svg>
  );
}

export function Logo({
  href = "/dashboard",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md";
}) {
  return (
    <Link
      href={href}
      className="brand-lockup group"
      aria-label="S Auction home"
    >
      <BrandMark
        className={size === "sm" ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"}
      />
      <span className="brand-wordmark">
        S<span className="brand-wordmark-light">AUCTION</span>
        <small>THE TEAM STARTS HERE</small>
      </span>
    </Link>
  );
}
