# STATUS: www.evanbecker.net

Rewritten, never appended. Under 60 lines. Last rewrite: 2026-11-17.

## Now
PRs #60 and #61 are merged into `develop`. The homelab still serves prod and test, unchanged, until the cutover.
Branch `account/notifications-and-names` (PR #62 into `develop`): two account-page follow-ups from Evan (11-17),
with `develop` merged in.

## On the branch (PR #62, open)
- A Notifications card where Labs was: one opt-in, "Email me newsletters and updates", off by default,
  saved per user (`User.NewsletterOptIn`, migration `AddNewsletterOptIn`). Nothing sends email yet.
- The user endpoints return #61's narrow `CurrentUserDto` plus the opt-in, to the signed-in user only.
- First name no longer falls back to the email: Auth0's `name` is the email for an email/password sign-up.
  The client and the API both refuse an email as a first name, and the migration clears stored ones.

## Merged into develop
- PR #61: comments removed (their tables and rows stay, unused). The newsletter sign-up needs reCAPTCHA and
  is rate-limited. The local database password comes from the environment. The personal-data guard
  (`PersonalDataGuardTests`, `AnonymousGetTests`) fails the build if an endpoint can return personal data.
- PR #60: one client image for test and prod, images to GHCR by full SHA (`develop` moves `:test`, `main`
  moves `:prod`), `--migrate-only` for the droplet, credentials through Access, the ray marcher's audio
  features removed, and the homelab's compose kept as it was.

## Checks (2026-11-17, local, this branch after the merge)
- `dotnet test`: 106 passed, the guard's 3 Postgres tests included (they need Docker or `EBN_GUARD_DATABASE`).
- Client: 13 unit tests passed, `nuxt build` passed. `nuxi typecheck`: the same 7 older errors (see Next).
- Both image smokes pass, and the new column is boolean, not null, default false.
- Not checked in a browser: the signed-in account page (needs an Auth0 sign-in).

## Blocked
- Key Vault proof run: `scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv` with no `INFISICAL_*` variables, then
  login, the account page, contact mail and the newsletter's reCAPTCHA. Waits for the vault (infra P1).

## Needs Evan
1. Review and merge PR #62. Merging moves `:test`, which the droplet's test host pulls.
2. Whether to drop the unused Comments and Replies tables. That's a migration, and the rows go with it.
3. Whether tests may use EF Core's in-memory provider (new test-only package, MIT). Not added.
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
