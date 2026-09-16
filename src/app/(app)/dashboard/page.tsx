import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/card";
import { RoleBadge } from "@/components/layout/RoleBadge";
import type { Role } from "@/types/roles";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "VIEWER") as Role;
  const name = profile?.display_name ?? user.email;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">Welcome, {name}</h1>
        <RoleBadge role={role} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {role === "MAIN_CONTROLLER" && (
          <>
            <QuickCard
              href="/admin/registrations"
              title="Review registrations"
              desc="Approve or reject Google Form submissions."
            />
            <QuickCard
              href="/admin/grading"
              title="Grade players"
              desc="Assign A+ through G1 categories."
            />
            <QuickCard
              href="/admin/teams"
              title="Manage teams"
              desc="Create 6 teams, upload logos, assign captains."
            />
            <QuickCard
              href="/admin/auction"
              title="Auction control"
              desc="Start, configure, and run the live auction."
            />
          </>
        )}

        {(role === "MAIN_CONTROLLER" || role === "AUCTIONEER") && (
          <QuickCard
            href="/auctioneer/console"
            title="Auctioneer console"
            desc="Big-screen controls for the live auction."
          />
        )}

        {role === "CAPTAIN" && (
          <>
            <QuickCard
              href="/captain/bid"
              title="Bid now"
              desc="See current player and place your bids."
            />
            <QuickCard
              href="/captain/my-team"
              title="My team"
              desc="Your squad and remaining purse."
            />
          </>
        )}

        <QuickCard
          href={role === "VIEWER" ? "/viewer/live" : "/captain/teams"}
          title="Live auction"
          desc="Watch the current player and live bids."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Auction has not started yet.</CardDescription>
        </CardHeader>
        <CardBody className="text-white/60 text-sm">
          Once the Main Controller opens the auction, this dashboard will show
          live updates here.
        </CardBody>
      </Card>
    </div>
  );
}

function QuickCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-emerald-400/40 transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}