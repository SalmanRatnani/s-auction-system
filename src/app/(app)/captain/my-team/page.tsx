import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamEditor } from "./TeamEditor";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  return (
    <RoleGuard allow={["CAPTAIN", "MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse")
    .eq("captain_user_id", user!.id)
    .maybeSingle();

  if (!team) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Waiting for team assignment</CardTitle>
          </CardHeader>
          <CardBody className="text-white/60 text-sm">
            The Main Controller hasn't assigned you to a team yet. Check back
            shortly, or contact the auctioneer.
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-white/50 text-sm mt-1">
          Set your team name and upload a logo.
        </p>
      </header>
      <TeamEditor team={team} />
    </div>
  );
}