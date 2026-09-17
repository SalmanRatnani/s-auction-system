import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { CreateViewerLink } from "./CreateViewerLink";

export const dynamic = "force-dynamic";

export default async function ViewerLinksPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

  const { data: links } = await supabase
    .from("viewer_links")
    .select("id, token, expires_at, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 max-w-3xl animate-fade-up">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Viewer Links
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Generate a public link anyone can open — no login needed.
        </p>
      </header>

      <CreateViewerLink auctionId={auction.id} />

      <Card>
        <CardHeader>
          <CardTitle>Recent links</CardTitle>
        </CardHeader>
        <CardBody>
          {!links || links.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-4)] py-2">
              No links generated yet.
            </p>
          ) : (
            <div className="space-y-1">
              {links.map((l) => {
                const expired = new Date(l.expires_at) < new Date();
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 py-2 border-b border-[var(--line-1)] last:border-0"
                  >
                    <code className="text-[11px] text-[var(--accent)] flex-1 truncate font-mono">
                      /watch/{l.token}
                    </code>
                    <span
                      className={`text-[10px] tnum ${
                        expired
                          ? "text-[var(--danger)]"
                          : "text-[var(--fg-4)]"
                      }`}
                    >
                      {expired
                        ? "expired"
                        : `expires ${new Date(l.expires_at).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}