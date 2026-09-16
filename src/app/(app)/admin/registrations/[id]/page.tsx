import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Signed URL for the private age proof (60s, controller-only)
  let proofUrl: string | null = null;
  if (reg.age_proof_url) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("age-proofs")
      .createSignedUrl(reg.age_proof_url, 60);
    proofUrl = data?.signedUrl ?? null;
  }

  // Look for duplicates — same phone or same name
  const { data: dupes } = await supabase
    .from("registrations")
    .select("id, name, phone, status, submitted_at, image_url, age")
    .neq("id", id)
    .or(`phone.eq.${reg.phone},name.ilike.${reg.name}`)
    .limit(10);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {reg.image_url && (
            <img
              src={reg.image_url}
              alt=""
              className="h-20 w-20 rounded-full object-cover border border-white/10"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">{reg.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                className={
                  reg.status === "PENDING"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : reg.status === "APPROVED"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-red-500/15 text-red-300 border-red-500/30"
                }
              >
                {reg.status}
              </Badge>
              <span className="text-xs text-white/50">
                Submitted{" "}
                {reg.submitted_at
                  ? new Date(reg.submitted_at).toLocaleString("en-IN")
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Form details</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Full Name" value={reg.name} />
              <Field label="DOB" value={reg.dob} />
              <Field label="Age (auto)" value={reg.age} />
              <Field label="Phone" value={reg.phone} />
              <Field label="Playing Centre" value={reg.playing_centre} />
              <Field
                label="Played Mira Bhayandar"
                value={reg.played_mira_bhayandar ? "Yes" : "No"}
              />
              <Field
                label="Age Proof Type"
                value={reg.age_proof_type}
                className="col-span-2"
              />
              <Field
                label="Participation History"
                value={reg.participation_history}
                className="col-span-2"
              />
              <Field
                label="Achievements"
                value={reg.achievements}
                className="col-span-2"
              />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Age proof</CardTitle>
          </CardHeader>
          <CardBody>
            {proofUrl ? (
              <div className="space-y-3">
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline text-sm"
                >
                  Open in new tab →
                </a>
                {reg.age_proof_url?.endsWith(".pdf") ? (
                  <div className="text-white/50 text-sm">
                    PDF — opens in new tab.
                  </div>
                ) : (
                  <img
                    src={proofUrl}
                    alt="Age proof"
                    className="rounded-lg border border-white/10 max-h-96"
                  />
                )}
                <p className="text-xs text-white/40">
                  Signed URL valid for 60 s. Every access is logged.
                </p>
              </div>
            ) : (
              <p className="text-white/40 text-sm">No proof uploaded.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {dupes && dupes.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle>Possible duplicates</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {dupes.map((d) => (
              <a
                key={d.id}
                href={`/admin/registrations/${d.id}`}
                className="flex items-center gap-3 text-sm hover:text-emerald-300"
              >
                {d.image_url && (
                  <img
                    src={d.image_url}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span>{d.name}</span>
                <span className="text-white/40">{d.phone}</span>
                <Badge>{d.status}</Badge>
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
      <dt className="text-white/40 text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-white/90 mt-0.5 whitespace-pre-wrap">
        {value == null || value === "" ? "—" : String(value)}
      </dd>
    </div>
  );
}