import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-court">
      <div className="max-w-md w-full text-center space-y-6 animate-slide-up">
        <div className="text-6xl">😕</div>
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold">
            Something went wrong
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            We couldn't complete the sign-in. This usually means the link
            expired or the account needs verification.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-6 py-3 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}