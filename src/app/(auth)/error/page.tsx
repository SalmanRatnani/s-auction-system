import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-[var(--bg-0)]">
      <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-[var(--line-2)] bg-[var(--bg-1)] p-8 animate-slide-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-bg)] text-[var(--accent)]">
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Let’s get you back in
          </h1>
          <p className="text-[var(--fg-3)] text-sm leading-relaxed">
            We couldn’t complete the sign-in. This usually means the link
            expired or the account needs verification.
          </p>
        </div>
        <Link href="/login" className="arena-button">
          Back to sign in
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
