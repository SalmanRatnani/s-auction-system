import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_ORDER, PLAYERS_PER_CATEGORY } from "@/constants/categories";
import { GradeChanger } from "./GradeChanger";
import { DeletePlayerButton } from "./DeletePlayerButton";

export const dynamic = "force-dynamic";

export default async function GradingPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("players")
    .select("id, player_code, name, image_url, grade, status")
    .order("grade")
    .order("name");

  const byGrade: Record<string, typeof players> = {};
  CATEGORY_ORDER.forEach((c) => (byGrade[c] = []));
  (players ?? []).forEach((p) => {
    if (p.grade) (byGrade[p.grade] ??= []).push(p);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-3xl font-bold">Grading</h1>
        <p className="text-white/50 text-sm mt-1">
          {players?.length ?? 0} approved players · {CATEGORY_ORDER.length * PLAYERS_PER_CATEGORY} slots total
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CATEGORY_ORDER.map((c) => {
          const list = byGrade[c] ?? [];
          const over = list.length > PLAYERS_PER_CATEGORY;
          return (
            <Card
              key={c}
              className={over ? "border-red-500/40" : undefined}
            >
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <Badge className="text-sm">{c}</Badge>
                  <span
                    className={`text-xs ${
                      over ? "text-red-300" : "text-white/50"
                    }`}
                  >
                    {list.length} / {PLAYERS_PER_CATEGORY}
                  </span>
                </div>
                <div className="space-y-2">
                  {list.length === 0 && (
                    <p className="text-xs text-white/30">No players yet.</p>
                  )}
                  {list.map((p) => (
                    <div
  key={p.id}
  className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 group"
>
  {p.image_url ? (
    <img
      src={p.image_url}
      alt=""
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <div className="h-8 w-8 rounded-full bg-white/5" />
  )}
  <span className="flex-1 text-sm truncate">{p.name}</span>
  <GradeChanger playerId={p.id} currentGrade={p.grade} />
  <DeletePlayerButton playerId={p.id} playerName={p.name} />
</div>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}