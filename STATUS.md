# STATUS: www.evanbecker.net

Rewritten, never appended. Under 60 lines. Last rewrite: 2026-11-20.

## Now
A3 prep (Evan, 11-19): get prod ready to move to the droplet. Prep only: nothing merges or pushes without
Evan's yes. Test already runs on the droplet. Prod still runs the homelab's images from May: `main` hasn't
moved since #58, so none of #60 to #63 is on prod yet.

## Ready, waiting on Evan
1. #65 (merged 11-20): the privacy policy names DigitalOcean's Toronto database and every service that sees
   visitor data. Branch `blog/hold-tunnel-post` (this branch) takes out the Cloudflare Tunnel article, which
   never went live (Evan, 11-20). With it gone, `content/` matches `main`, so the promote publishes no article.
2. The `develop` → `main` promote PR (drafted, not opened). **Merge it with a merge commit**, never squash or
   rebase: the workflow reuses the image test ran only when `main`'s merge commit has `develop`'s tip as its
   second parent and the same tree. Merging moves `:prod` on GHCR and nothing else; the homelab never reads it.
3. After the promote: send the two digests from the run's summary to evanflow-infra for the prod pin.

## The cutover, in order (with evanflow-infra)
This branch merges → test build passes → promote → prod pin → the homelab's prod dump restored into `ebn_prd`
→ migrate (one migration: `AddNewsletterOptIn`) → hostnames flip → checks → the homelab retires → cleanup PR.

## Merged into develop, not yet on prod
- #63: the desired-state tree in `docs/knowledge/`.
- #62: the Notifications opt-in, and no email stored as a first name.
- #61: comments removed, the newsletter's reCAPTCHA and rate limit, and the personal-data guard.
- #60: one image for test and prod, images by full SHA, `--migrate-only` for the droplet.

## Checks (2026-11-20)
- `main` plus `develop` merges cleanly, to exactly `develop`'s tree.
- This branch: client unit tests (13) and `nuxt build` passed. Built, `/articles` and the sitemap list the
  same five articles prod serves, and the tunnel article's URL is a 404.

## Needs Evan
1. Yes to push this branch and open its PR, and later to open the promote PR.
2. Read the privacy wording. The deploy agent's pre-migration dumps have no decided home yet, so the policy
   names only DigitalOcean's daily backups. Is this change one to flag in the newsletter?
3. Confirm in the providers' consoles: the reCAPTCHA key (shared by test and prod) lists `www.evanbecker.net`,
   `evanbecker.net` and `test.evanbecker.net`; the prod Auth0 app's callback and logout URLs match the prod
   client's redirect URI exactly.
4. Whether to fix the homelab's prod before the cutover. The options and their risks are in the A3 notes,
   outside this public repo.
5. Still open: dropping the unused Comments and Replies tables (a migration).

## Blocked
- The cutover waits for evanflow-infra (its Pi runner is offline) and for the prod vault's three secrets.

## After the retire
- A cleanup PR: `infrastructure/` leaves this repo, Infisical leaves the code, tests, README and compose,
  `docker-compose.production.yaml` goes, and CLAUDE.md rules 6 and 7 change (Evan's or the Director's call).
- Portfolio content that mentions Infisical or the homelab stays as it is, unless Evan says otherwise.

## Watch
- A change to `docker-compose.production.yaml` on `develop` reaches the homelab within two minutes.
- #64 (the blog drafts) must not merge into `develop` before Evan reads it: the promote would carry it to prod.
  It revises the tunnel article and links to it, so it needs updating once this branch merges.
