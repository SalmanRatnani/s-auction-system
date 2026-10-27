import { createAuthorizedReader } from "@/lib/security/page-access";
import { Download } from "lucide-react";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ auctionId?: string }>;
}) {
  const reader = await createAuthorizedReader([
    "MAIN_CONTROLLER",
    "AUCTIONEER",
  ]);
  const { data: auctions, error } = await reader
    .from("auctions")
    .select("id,name,status,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Auction archive could not be loaded");
  const requested = (await searchParams).auctionId;
  const selected =
    auctions?.find((a) => a.id === requested) ??
    auctions?.find((a) => a.status === "ENDED") ??
    auctions?.[0];
  if (!selected) return <p>No auctions available to export.</p>;
  const query = `?auctionId=${selected.id}`;
  return (
    <RoleGuard allow={["MAIN_CONTROLLER", "AUCTIONEER"]}>
      <div className="space-y-6 max-w-3xl animate-fade-up">
        <header>
          <h1 className="text-[22px] font-semibold tracking-tight">Exports</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            Download CSV files of auction results.
          </p>
        </header>

        <form method="get" className="flex flex-wrap gap-3 items-end">
          <label className="text-sm space-y-2">
            Auction
            <select
              name="auctionId"
              defaultValue={selected.id}
              className="block rounded-lg border border-[var(--line-2)] bg-[var(--bg-1)] p-3 min-h-11"
            >
              {auctions?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.status} ·{" "}
                  {new Date(a.created_at).toLocaleDateString("en-IN")}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline">
            Choose auction
          </Button>
        </form>
        <p className="text-sm text-[var(--fg-3)]">
          Exporting {selected.name} · {selected.status}. Prices include exact
          paise, and rosters include image references and both playing-captain
          slots.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ExportCard
            title="Teams & Rosters"
            desc="Every team with the players they won, prices, and acquisition round."
            href={"/api/export/teams" + query}
          />
          <ExportCard
            title="Bid History"
            desc="Every bid placed, including undone bids, with timestamps."
            href={"/api/export/bids" + query}
          />
          <ExportCard
            title="Purse Summary"
            desc="Initial, spent, and remaining purse per team."
            href={"/api/export/purse" + query}
          />
        </div>

        <p className="text-[12px] text-[var(--fg-4)]">
          CSVs open in Excel, Google Sheets, and Numbers.
        </p>
      </div>
    </RoleGuard>
  );
}

function ExportCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[14px]">{title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-[12px] text-[var(--fg-3)] leading-relaxed">{desc}</p>
        <a href={href}>
          <Button size="sm" variant="outline" className="w-full">
            <Download size={13} strokeWidth={2} />
            Download CSV
          </Button>
        </a>
      </CardBody>
    </Card>
  );
}
