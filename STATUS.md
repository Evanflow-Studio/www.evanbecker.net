# STATUS: www.evanbecker.net

Rewritten, never appended. Under 60 lines. Last rewrite: 2026-11-17.

## Now
PR #60 (the app side of the DigitalOcean move) is merged into `develop`. The droplet's test host runs it,
not public yet. The homelab still serves prod and test, unchanged, until the cutover.
Branch `account/notifications`, for a PR into `develop`: two account-page follow-ups from Evan (11-17).

## On the branch (not pushed)
- A Notifications card where Labs was: one opt-in, "Email me newsletters and updates", off by default,
  saved per user (`User.NewsletterOptIn`, migration `AddNewsletterOptIn`). Nothing sends email yet.
- The user endpoints return `CurrentUserDto`, so the opt-in stays out of the public comments payload.
- First name no longer falls back to the email: Auth0's `name` is the email for an email/password sign-up.
  The client and the API both refuse an email as a first name, and the migration clears stored ones.

## Merged in PR #60
- One client image for test and prod (public config at runtime, `evanbecker-client/env/*.env`).
- Images to GHCR by full SHA; `develop` moves `:test`, `main` moves `:prod` to the image test ran.
- `--migrate-only` and `Database__MigrateOnStartup=false` for the droplet; credentials through Access.
- The ray marcher's audio visualizer, YouTube search and jam sessions removed.
- The homelab's compose kept as it was, so merges don't touch the homelab.

## Checks (2026-11-17, local, this branch)
- `dotnet test`: 47 passed. Client: 13 unit tests passed, `nuxt build` passed.
- Both image smokes pass: 8 migrations, and the new column is boolean, not null, default false.
- The migration over old rows on Postgres 18: an email first name is cleared, a real one kept.
- `nuxi typecheck`: the same 7 older errors (see Next). No ESLint in the repo.
- Not checked in a browser: the signed-in account page (needs an Auth0 sign-in).

## Blocked
- Key Vault proof run: `scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv` with no `INFISICAL_*` variables, then
  login, comments, contact mail and reCAPTCHA. Waits for the vault (infra P1) and its values.

## Needs Evan
1. Go-ahead to push `account/notifications` and open its PR into `develop`.
2. Whether tests may use EF Core's in-memory provider (new test-only package, MIT). Not added.
3. The public comments endpoint returns each author's email, Auth0 ID and admin flags. Proposed: a
   small PR that shows authors only their name and avatar, before the cutover.
4. If not done yet: fork PR workflows → require approval for all outside collaborators; make the two
   GHCR packages public; fill `ef-ebn-tst-eus2-kv` (`Email--ApiKey`, `Email--ToAddress`,
   `Recaptcha--SecretKey`; evanflow-infra writes `ConnectionStrings--Database`).
5. Keep the five `AUTH0_*` keys and `YOUTUBE_API_KEY` in Infisical until it retires at the cutover.

## Needs evanflow-infra
- Its `deploy/apps/ebn` client sets only four public values. It also needs `NUXT_PUBLIC_AUTH0_DOMAIN`,
  `_CLIENT_ID`, `_AUDIENCE` and `_RECAPTCHA_SITE_KEY` (the values in `evanbecker-client/env/*.env`).

## Next
- The Key Vault proof run, then the cutover (A3, with evanflow-infra).
- Proposed: squash the migrations into one, once the homelab databases retire. Typecheck to zero errors.
- Later: the Evanflow site may use this Auth0 tenant with its own Organization. Keep nothing tenant-pinned.

## Watch
- Any change to `docker-compose.production.yaml` on `develop` reaches the homelab within two minutes. Leave it
  as it is until the cutover unless Evan asks.
