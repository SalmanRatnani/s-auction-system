import { createAuthorizedReader } from "@/lib/security/page-access";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_ORDER,
  PLAYERS_PER_CATEGORY,
  toneForGrade,
} from "@/constants/categories";
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
  const reader = await createAuthorizedReader(["MAIN_CONTROLLER"]);

  const { data: players } = await reader
    .from("players")
    .select("id, player_code, name, image_url, grade, status")
    .order("grade", { ascending: true })
    .order("name", { ascending: true });

  const byGrade: Record<string, typeof players> = {};
  CATEGORY_ORDER.forEach((c) => (byGrade[c] = []));
  (players ?? []).forEach((p) => {
    if (p.grade) (byGrade[p.grade] ??= []).push(p);
  });

  const total = players?.length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Grading</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          <span className="tnum">{total}</span> approved player
          {total === 1 ? "" : "s"} ·{" "}
          <span className="tnum">
            {CATEGORY_ORDER.length * PLAYERS_PER_CATEGORY}
          </span>{" "}
          slots total
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORY_ORDER.map((c) => {
          const list = byGrade[c] ?? [];
          const over = list.length > PLAYERS_PER_CATEGORY;
          return (
            <Card
              key={c}
              className={over ? "border-[var(--danger-line)]" : undefined}
            >
              <CardBody className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge tone={toneForGrade(c)}>{c}</Badge>
                  <span
                    className={`text-[11px] tnum ${
                      over ? "text-[var(--danger)]" : "text-[var(--fg-4)]"
                    }`}
                  >
                    {list.length}/{PLAYERS_PER_CATEGORY}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {list.length === 0 && (
                    <p className="text-[12px] text-[var(--fg-4)] py-1">
                      No players yet.
                    </p>
                  )}
                  {list.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-2 py-1.5 border-b border-[var(--line-1)] last:border-0"
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover border border-[var(--line-1)]"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-[var(--bg-2)] border border-[var(--line-1)]" />
                      )}
                      <span className="flex-1 text-[12px] text-[var(--fg-1)] truncate">
                        {p.name}
                      </span>
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
