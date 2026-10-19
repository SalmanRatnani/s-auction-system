import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function RegistrationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner params={params} />
    </RoleGuard>
  );
}

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();

  if (!reg) notFound();

  // Check for duplicates based only on name (since phone is no longer collected)
  const { data: dupes } = await supabase
    .from("registrations")
    .select("id, name, status, submitted_at, image_url, age")
    .neq("id", id)
    .ilike("name", reg.name)
    .limit(10);

  return (
    <div className="space-y-6 max-w-5xl animate-fade-up">
      <header className="flex items-center gap-4 flex-wrap">
        {reg.image_url && (
          <img
            src={reg.image_url}
            alt=""
            className="h-16 w-16 rounded-lg object-cover border border-[var(--line-1)]"
          />
        )}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{reg.name}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge
              tone={
                reg.status === "PENDING"
                  ? "warning"
                  : reg.status === "APPROVED"
                  ? "success"
                  : "danger"
              }
            >
              {reg.status.toLowerCase()}
            </Badge>
            <span className="text-[11px] text-[var(--fg-4)]">
              Submitted{" "}
              {reg.submitted_at
                ? new Date(reg.submitted_at).toLocaleString("en-IN")
                : "—"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Form details</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-[13px]">
              <Field label="Full Name" value={reg.name} />
              <Field label="Playing Hand" value={reg.playing_hand} />
              <Field label="Playing Centre" value={reg.playing_centre} />
              <Field
                label="Achievements"
                value={reg.achievements}
                className="sm:col-span-2"
              />
            </dl>
          </CardBody>
        </Card>
      </div>

      {dupes && dupes.length > 0 && (
        <Card className="border-[var(--warning-line)]">
          <CardHeader>
            <CardTitle>Possible duplicates</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {dupes.map((d) => (
              <a
                key={d.id}
                href={`/admin/registrations/${d.id}`}
                className="flex items-center gap-3 text-[13px] hover:text-[var(--accent)] transition-colors py-1"
              >
                {d.image_url && (
                  <img
                    src={d.image_url}
                    alt=""
                    className="h-7 w-7 rounded-md object-cover"
                  />
                )}
                <span className="flex-1 text-[var(--fg-1)]">{d.name}</span>
                <Badge
                  tone={
                    d.status === "APPROVED"
                      ? "success"
                      : d.status === "PENDING"
                      ? "warning"
                      : "danger"
                  }
                >
                  {d.status.toLowerCase()}
                </Badge>
              </a>
            ))}
          </CardBody>
        </Card>
      )}

      <ReviewForm
        registrationId={reg.id}
        currentStatus={reg.status}
        defaultGrade={null}
      />
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
        {label}
      </dt>
      <dd className="text-[13px] text-[var(--fg-1)] mt-0.5 whitespace-pre-wrap">
        {value == null || value === "" ? "—" : String(value)}
      </dd>
    </div>
  );
}