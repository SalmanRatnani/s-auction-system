import { NextResponse } from "next/server";

// Playing captains are no longer assigned during the live bidding round.
// The controller must run the transactional Final allotment after Round 2.
export async function POST() {
  return NextResponse.json({ error: "Use Final allotment after completing the auction rounds." }, { status: 409 });
}
