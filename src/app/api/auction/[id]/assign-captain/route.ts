import { NextResponse } from "next/server";

// Playing captains are no longer assigned during the live bidding round.
// Category closure settles the reserved captains transactionally.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Playing captains are allotted automatically when their category is complete.",
    },
    { status: 409 },
  );
}
