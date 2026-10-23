# S Auction redesign

This update gives the existing auction system a navy, lime and off-white visual identity. It retains the existing Supabase backend, role permissions and virtual-credit auction rules.

## Experience

- Custom vector S monogram, wordmark, favicons, app icons and social preview artwork. Regenerate the packaged artwork with `npm run brand:generate`.
- Redesigned homepage, sign-in, navigation, dashboard, team identities and player cards across the captain, auctioneer, spectator and projector screens.
- The dashboard reads the latest auction and shows actual roster counts, queued players, virtual spend, team purses and the latest allotment.
- `/demo` runs entirely in browser memory with fictional sample data. It makes no auction or database changes.
- Mobile layouts, visible keyboard focus, a native dialog navigation drawer, accessible form labels, reduced-motion support and broken-image fallbacks.
- Inline custom bids, purse-aware bid controls, duplicate-submit guards and recoverable connection errors. Existing server/database validation remains authoritative.
- Self-hosted Inter fonts with their SIL Open Font License in `public/fonts/OFL.txt`.

## Motion and interaction polish

- Coordinated hero and illustration entrances, one-time scroll reveals, animated navigation underlines and restrained button/arrow feedback. Scroll content is visible without JavaScript; already-visible content is not hidden after hydration.
- Short workspace route transitions preserve the child tree and do not replay when realtime auction data updates. Dashboard cards enter in a brief sequence; player changes and incoming bids have distinct visual cues.
- Bid and purse values render their exact new value immediately, with a brief highlight. Monetary figures never count through intermediate amounts.
- The demo has a sliding perspective selector with arrow-key/Home/End navigation, an associated tab panel, clear action feedback, sale confirmation and a virtual purse limit.
- The native mobile dialog animates in and out on browsers supporting discrete transitions, with an immediate-close fallback. Focus trapping, Escape, focus restoration and existing body overflow are preserved.
- Sales use a dismissible, non-modal celebration with finite confetti and Escape dismissal. The rest of the workspace remains interactive.
- CSS and Web Animations honor reduced motion, including preference changes during a running animation. Focus cancels decorative reveals. No animation dependencies were added.

## Security changes

- Block cross-origin browser writes at the API boundary; routes retain their own authentication, authorization or webhook signature checks.
- Restrict post-login destinations to application paths and avoid putting provider error messages into redirect URLs.
- Bound multipart/webhook bodies while reading the stream, including requests without a Content-Length header.
- Require a controller or the team's currently authorized captain role for logo uploads. Verify raster signatures, decode only still JPEG/PNG/WebP images, cap size/pixels and re-encode to a metadata-free WebP with a unique storage path. Remove a new upload if saving its database reference fails.
- Remove internal captain account IDs from unauthenticated spectator snapshots.
- Add response headers for framing, MIME sniffing, referrers and browser permissions, plus production HSTS and private API caching. The CSP is a baseline for objects, base URLs and framing; it is not a comprehensive script policy.
- Update Next.js to 16.3.8, sharp to 0.35.5 and the affected transitive source-map dependency. Production dependency audit reported zero known vulnerabilities during validation on 22 October 2026.

## Verification and release

Run with Node.js 22:

```sh
npm ci
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
npm run build
```

The eight Node tests cover the existing CSV/signature/identifier helpers and the added origin, redirect, streamed-body and image validation protections. The quality workflow also builds the application.

Public product pages and the demo can be previewed without database credentials. Authenticated functionality requires the existing Supabase environment variables and migrations. No database migrations or production records are changed by this update.

Before using a real auction, complete the role, concurrent bidding, viewer-token, upload/storage and state-transition checks in `AUCTION_RELEASE_TEST_PLAN.md` and `SECURITY_RELEASE_NOTES.md` against an isolated staging database. Passing unit tests and a production build does not establish that the live database has the required migrations or policies.
