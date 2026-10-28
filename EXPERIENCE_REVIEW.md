# Experience and reliability review — 29 October 2026

This pass covers source review, isolated regression tests, deployment compatibility checks and the public demo. It is not a completed production auction rehearsal.

## Fixed

- A mobile navigation blur with no next focus target could close the menu before a tap reached its link. Navigation now closes on actual outside pointer/focus events, selection or Escape. Opening the theme control also dismisses navigation.
- The workspace drawer now closes when its logo or another route is selected, restoring scrolling.
- A failed auction refresh could be overridden by the freshness timer, briefly enabling stale controls. Failures remain stale until a successful snapshot; changing rooms resets freshness and retry state. Revoked access removes the last snapshot, and late responses from a previous room are ignored.
- Missing auction deployment dependencies return a controlled, uncached 503 response. The UI distinguishes setup unavailability, expired access and connection failures without exposing database messages or falling back to legacy writes.
- Auction mode changes now have a timeout, a synchronous request guard and a `finally` cleanup. Lost connections release the button and prompt a refresh. A mode change cannot overtake an unconfirmed auction action.
- Pending-action indicators render from React state while their exact retry payload remains in a ref.
- The inactivity timer tolerates denied storage and malformed activity timestamps.
- The sign-in error page uses theme tokens, fixing unreadable text in light mode.
- ESLint now has a flat configuration and runs in CI. React Compiler effect/memoization migration diagnostics are warnings because the compiler is not enabled; correctness and accessibility errors fail the job.

## Motion additions

- Restrained pointer depth for the homepage auction card and role preview. Pointer work is batched to one animation frame; touch, focus and reduced motion remain stationary.
- Staggered role details, team crests and mobile navigation items, plus a finite highlight across the sample workspace.
- Activity rows animate into place and existing rows move smoothly without losing their DOM identity. Interrupted transitions continue from their current position.
- Reduced-motion users retain the lightweight arena poster without initializing Three.js. Changing that preference releases an existing scene. Hidden/offscreen scenes do not start animation.
- Bid and purse amounts remain exact immediately. No animation framework or new runtime dependency was added.

## Verification

The local suite passes 33 tests, with one native-concurrency test reserved for PostgreSQL CI. New regressions exercise touch-style blur, keyboard/outside dismissal, pointer frame coalescing, touch/reduced-motion suppression, interrupted activity motion, stale-state recovery, access revocation, late responses, and failed/pending mode changes.

Production build and TypeScript validation pass. Production dependency audit: zero vulnerabilities. Lint: zero errors, 21 advisory warnings (13 existing image optimizations, seven effect initialization advisories, one memoization advisory). This does not claim a clean advisory backlog.

The managed local preview service was unavailable. Physical iOS/Android rendering and a signed-in six-team browser rehearsal remain manual checks. Native SQL concurrency is checked separately by the Auction SQL integration workflow.

## Deployment prerequisite

Application changes from the auction-integrity release require `supabase/migrations/20261027152924_auction_integrity_and_access.sql`. Deploying the UI does not apply this migration. Confirm its application and verify the current database before running an auction. The controlled unavailable state does not substitute for the database upgrade or resolve outstanding database security advisories.

## Motion references

- [web.dev: high-performance animations](https://web.dev/articles/animations-guide)
- [W3C: animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
