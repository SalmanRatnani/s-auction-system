# Security and reliability hardening (October 2026)

This branch is a **first security and correctness tranche**, not a declaration that the auction is production-ready.

## Changes
- Tightened RLS, removed directly writable privileged tables, private viewer-token enumeration, and forged audit inserts. Enforced one `CURRENT` player per auction at the database level.
- Viewer snapshots require a logged-in application role or an auction-scoped, unexpired viewer token. Live viewer and projector now pass their viewer token during polling and clear state if authorization fails.
- Created cryptographically unpredictable 128-bit viewer-link tokens; rejected invalid expiry durations and auction IDs.
- Limited inbound webhooks to 64 KiB, validated storage response identifiers and signed upload MIME types.
- Protected CSV exports against spreadsheet formula injection and validated purse top-ups as positive safe integers.
- Added Node-based security tests and a GitHub Actions quality workflow.

## Additional auction-day protections (0025)
- Live bids are validated against per-category virtual-credit base prices and increments in SQL, including configured squad capacity and reserved playing-captain slots.
- The next-player API uses one locked transactional RPC to close completed grades, pick the next category player, mark CURRENT and record the audit entry.
- The dedicated tests/sql/virtual-credits.sql fixture runs in CI on isolated PostgreSQL. It does not substitute for real Supabase staging or simultaneous six-team browser tests.
- Auction credits are virtual, with each team configured for a ₹1 crore equivalent starting purse; no payment processing is implemented.

## REQUIRED staging checks before merge / live auction
1. Back up the database and storage. Confirm migrations through 0023 have been applied, and check for existing duplicate `CURRENT` players. Apply 0024 **to an isolated staging Supabase instance**; it will intentionally fail if existing duplicate rows violate the new unique index.
2. Test controller, auctioneer, captain, viewer and unauthenticated roles against player and auction endpoints, exports and protected storage. Confirm the authenticated UI doesn't rely on a newly revoked direct table permission.
3. Test spectator links before and after expiration, with a mismatched auction ID, and after revocation. Verify that a removed link cannot retrieve snapshots even with an old URL.
4. Dry-run bidding, category/playing-captain allotment, round two, pause/resume, reset, webhook ingestion, top-ups and all staff flows. See AUCTION_RELEASE_TEST_PLAN.md.
5. Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` with staging environment variables.
6. Review GitHub Actions and Vercel preview results on this exact head commit. Merge only after checks pass.

## Known follow-up risks
- `next-player`, reset, and several write routes still need fully transactional RPC-based state transitions. The unique `CURRENT` index rejects a second draw but does **not** make the multi-request draw/sell workflow atomic.
- Per-grade minimum/increment and configured squad limits are now also guarded by the 0025 database trigger. Stress-test concurrency and mid-auction configuration before live use.
- More complete integration tests need an isolated Supabase database; the added Node tests check only pure helpers.
- Client Realtime subscriptions, role-based purse visibility, status transitions, and document/storage privacy should receive additional end-to-end validation.
- Database changes have not been applied to production and no production credentials are required or used for this PR.

**Do not apply migrations to production or run a live auction solely on the basis of this patch.**
