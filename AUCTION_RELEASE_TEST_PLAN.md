# Auction release verification

## Automated gates

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm audit --omit=dev --audit-level=high`, and `npm run build`.

The local SQL suite applies **every migration**, in order, to isolated PGlite PostgreSQL. GitHub's Auction SQL integration job repeats that suite on native PostgreSQL 17, with independent connections for simultaneous bids, sale versus undo, and repeated top-ups. The platform fixture only supplies Auth, Storage and roles; it does not substitute application functions.

Never point automated integration tests at production. `PG_TEST_URL` accepts only a local database whose name ends in `_test`.

## Supported auction behavior

- Exactly six teams and authorized captain logins are required before Start. Settings and captain assignments lock after Start.
- Categories proceed A+ through G1. Unsold players retry immediately in the same category; only the controller can skip a retried player.
- Playing captains are reserved, excluded from ordinary draws, and settled at their category's completed sale average, falling back to base price when there are no sales. Already-allotted captains consume roster places once.
- A settlement shortfall rejects the entire category-closing sale. The controller reviews the displayed estimate, supplies an explicit top-up if appropriate, and retries. No automatic credits are invented.
- Pause/resume are available to auctioneers. Bids and commands serialize on auction → player attempt → team locks.
- Commands carry a unique action ID and expected version, player attempt and leader where relevant. Retrying the same ID/input returns the stored result; a stale new action is rejected.
- Reset is limited to DRAFT/PAUSED rehearsals. Completed and live-event records are preserved. Reset retains team configuration and captain selections.
- Exports require an explicit event and preserve exact paise, player IDs, image references and captain slots. A newly opened draft must not redirect completed-event exports.

## Database release

The forward migration `20261027152924_auction_integrity_and_access.sql` reconciles the known deployed permission and bid-rule drift. Do not replay older migrations blindly. Inspect grants, signatures, active auction status, and required columns before applying it. Release the matching application with it: legacy direct RPCs and broad reads are deliberately restricted.

After migration, check function/table privileges, RLS/storage policies, bid-rule/version triggers, and Supabase advisors. Verify that the public deployment points to the intended project. No production auction records should be used as fixtures.

## Manual and operational checks still required before a venue event

- Physical Android/iPhone: light/dark/system themes, persistence, narrow layout, keyboard, text zoom and reduced motion. The DOM regression covers mobile blur before option activation but is not a physical-device rendering test.
- Full signed-in controller, auctioneer, captain, partner and spectator flows against staging; denied/demoted accounts; revoked-link refresh; loading/error states.
- Interrupted HTTP response, sleeping phone, websocket loss and recovery. Unconfirmed commands expose a retry control; never queue offline bids.
- Tournament-system import of a completed event's CSV files.
- Measured bid acknowledgement/propagation latency and venue-sized load. No measured capacity guarantee is implied by unit or SQL tests.
- Database **and image** backup/restore rehearsal, retention and alerts. MFA enrollment and leaked-password protection need an account-policy rollout; this release does not claim they are enabled.
