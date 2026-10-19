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
  playing_hand: string | null;
  playing_centre: string | null;
  image_url: string | null;
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
    .select("id, name, playing_hand, playing_centre, image_url, status, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as Row[];
  const pending = rows.filter((r) => r.status === "PENDING");
  const rest = rows.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Registrations
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          <span className="tnum">{pending.length}</span> pending ·{" "}
          <span className="tnum">{rest.length}</span> reviewed
        </p>
      </header>

      <Section title="Pending" rows={pending} />
      <Section title="Reviewed" rows={rest} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <h2 className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] mb-3">
        {title}
      </h2>
      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-[13px] text-[var(--fg-4)] py-6">
            Nothing here yet.
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/registrations/${r.id}`}>
              <Card className="hover:border-[var(--accent-line)] transition-colors duration-100 cursor-pointer h-full">
                <CardBody className="flex gap-3 items-start p-4">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover border border-[var(--line-1)]"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                      {String(r.name ?? "—")}
                    </div>
                    <div className="text-[11px] text-[var(--fg-3)] mt-0.5 truncate">
                      {r.playing_hand ? `${r.playing_hand} hand` : "Hand —"} ·{" "}
                      {r.playing_centre ?? "Centre —"}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        tone={
                          r.status === "PENDING"
                            ? "warning"
                            : r.status === "APPROVED"
                            ? "success"
                            : "danger"
                        }
                      >
                        {String(r.status).toLowerCase()}
                      </Badge>
                      {r.submitted_at && (
                        <span className="text-[10px] text-[var(--fg-4)]">
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