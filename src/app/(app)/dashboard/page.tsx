import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  Star,
  Users,
  Target,
  Gavel,
  Zap,
  Shield,
  Radio,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { RoleBadge } from "@/components/layout/RoleBadge";
import type { Role } from "@/types/roles";

export const dynamic = "force-dynamic";

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
    <div className="space-y-6 max-w-5xl animate-fade-up">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[22px] font-semibold tracking-tight">
          Welcome, {name}
        </h1>
        <RoleBadge role={role} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {role === "MAIN_CONTROLLER" && (
          <>
            <QuickCard
              href="/admin/registrations"
              icon={ClipboardList}
              title="Review registrations"
              desc="Approve or reject Google Form submissions."
            />
            <QuickCard
              href="/admin/grading"
              icon={Star}
              title="Grade players"
              desc="Assign A+ through G1 categories."
            />
            <QuickCard
              href="/admin/teams"
              icon={Users}
              title="Manage teams"
              desc="Create 6 teams, assign captains."
            />
            <QuickCard
              href="/admin/auction"
              icon={Target}
              title="Auction control"
              desc="Start, configure, and run the auction."
            />
          </>
        )}

        {(role === "MAIN_CONTROLLER" || role === "AUCTIONEER") && (
          <QuickCard
            href="/auctioneer/console"
            icon={Gavel}
            title="Auctioneer console"
            desc="Big-screen controls for the live auction."
          />
        )}

        {role === "CAPTAIN" && (
          <>
            <QuickCard
              href="/captain/bid"
              icon={Zap}
              title="Bid now"
              desc="See current player and place your bids."
            />
            <QuickCard
              href="/captain/my-team"
              icon={Shield}
              title="My team"
              desc="Your squad and remaining purse."
            />
          </>
        )}

        <QuickCard
          href={role === "VIEWER" ? "/viewer/live" : "/captain/teams"}
          icon={Radio}
          title="Live auction"
          desc="Watch the current player and live bids."
        />
      </div>

      <Card>
        <CardBody className="p-5">
          <div className="text-[14px] font-medium text-[var(--fg-1)]">
            Status
          </div>
          <p className="text-[13px] text-[var(--fg-3)] mt-1 leading-relaxed">
            Once the Main Controller opens the auction, this dashboard will show
            live updates.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function QuickCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full hover:border-[var(--accent-line)] transition-colors duration-100 cursor-pointer">
        <CardBody className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="h-8 w-8 grid place-items-center rounded-md border border-[var(--line-1)] bg-[var(--bg-2)]">
              <Icon size={15} strokeWidth={1.75} className="text-[var(--accent)]" />
            </div>
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="text-[var(--fg-4)] transition-transform duration-100 group-hover:translate-x-0.5 group-hover:text-[var(--fg-2)]"
            />
          </div>
          <div>
            <div className="text-[14px] font-medium text-[var(--fg-1)]">
              {title}
            </div>
            <div className="text-[12px] text-[var(--fg-3)] mt-1 leading-relaxed">
              {desc}
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}