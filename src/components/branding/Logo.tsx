import Link from "next/link";

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 group">
      <span className="text-2xl leading-none">🏸</span>
      <span className="text-lg font-black tracking-tight">
        S Auction <span className="text-emerald-400">System</span>
      </span>
    </Link>
  );
}