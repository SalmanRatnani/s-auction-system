# Auction release verification

This feature branch requires **0015**, **0016**, then **0017** before the new API can run. Never point automated integration tests at production.

## Build gate
- Vercel preview build must pass on this exact commit (not an older one).
- Start a fresh **isolated Supabase development project** or local PostgreSQL/Supabase instance. No paid database branch or new project has been created automatically.

## Controlled dry-run scenarios
1. Create six teams, assign one and two captain logins, zero/two playing captains, and different grades to each team's two reserved players.
2. Draw in **A+ → A1 → A2 → A3 → B1 → … → G1** order. The API must reject jumping forward; a grade with zero eligible players must be skipped.
3. Bid using both partner accounts: both must affect the same purse, and neither can bid on a player reserved for either playing captain slot or their reserved grades.
4. Attempt concurrent draws and sales; only one CURRENT player per auction is allowed.
5. Finish Round 1 including unsold players. Round 2 should reject early start, then create new round=2 rows for **the same players** without losing old bids.
6. Re-auction unsold players by category; check fresh prices and sale labels.
7. Try final allotment before all draws are finished: it must reject without writing anything.
8. After all draws, finalize two reserved captains on the same team with **different grades**. Verify average excludes MANUAL_ALLOT entries and includes Round 2 sales, fallback to base price, both roster slots, ledger deductions, and repeated finalize is rejected.
9. Attempt allotment with insufficient purse/full squad/category collision. Expect **all-or-nothing** rollback and no finalized flag.
10. End only after final allotment. Reset and verify captains, their statuses, Round 2 flags, player pool, ledger and rosters are restored. Repeat a clean run.

## Release rules
A green Vercel build is necessary but does **not** validate SQL transactions. Do not merge or deploy to a live auction without an isolated database passing the scenarios above.
