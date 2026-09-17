import Link from "next/link";
import Image from "next/image";

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
      <span
        className={`${box} relative rounded-md overflow-hidden transition-transform duration-150 group-hover:scale-[1.03]`}
      >
        <Image
          src="/android-chrome-192x192.png"
          alt="S Auction System"
          fill
          sizes="28px"
          className="object-cover"
          priority
        />
      </span>
      <span className={`${text} font-semibold tracking-tight text-[var(--fg-1)]`}>
        Auction
      </span>
    </Link>
  );
}