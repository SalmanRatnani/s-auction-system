// src/app/(app)/admin/registrations/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  dob: string | null;
  age: number | null;
  phone: string | null;
  image_url: string | null;
  age_proof_type: string | null;
  status: string;
  submitted_at: string | null;
};

export default async function RegistrationsPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("registrations")
    .select("id, name, dob, age, phone, image_url, age_proof_type, status, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as Row[];
  const pending = rows.filter((r) => r.status === "PENDING");
  const rest = rows.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Registrations</h1>
          <p className="text-white/50 text-sm mt-1">
            {pending.length} pending · {rest.length} reviewed
          </p>
        </div>
      </header>

      <Section title="Pending" rows={pending} />
      <Section title="Reviewed" rows={rest} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <h2 className="text-sm uppercase tracking-wider text-white/50 mb-3">
        {title}
      </h2>
      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-white/40">Nothing here yet.</CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/registrations/${r.id}`}>
              <Card className="hover:border-emerald-400/40 transition-colors cursor-pointer h-full">
                <CardBody className="flex gap-3 items-start">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{String(r.name ?? "—")}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Age {String(r.age ?? "?")} · {String(r.age_proof_type ?? "—")}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        className={
                          r.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : r.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/15 text-red-300 border-red-500/30"
                        }
                      >
                        {String(r.status)}
                      </Badge>
                      {r.submitted_at && (
                        <span className="text-[10px] text-white/40">
                          {timeAgo(r.submitted_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}