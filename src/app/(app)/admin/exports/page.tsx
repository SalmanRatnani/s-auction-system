import { Download } from "lucide-react";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER", "AUCTIONEER"]}>
      <div className="space-y-6 max-w-3xl animate-fade-up">
        <header>
          <h1 className="text-[22px] font-semibold tracking-tight">Exports</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            Download CSV files of auction results.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ExportCard
            title="Teams & Rosters"
            desc="Every team with the players they won, prices, and acquisition round."
            href="/api/export/teams"
          />
          <ExportCard
            title="Bid History"
            desc="Every bid placed, including undone bids, with timestamps."
            href="/api/export/bids"
          />
          <ExportCard
            title="Purse Summary"
            desc="Initial, spent, and remaining purse per team."
            href="/api/export/purse"
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