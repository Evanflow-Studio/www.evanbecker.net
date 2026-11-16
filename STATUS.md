# STATUS: www.evanbecker.net

Rewritten, never appended. Under 60 lines. Last rewrite: 2026-11-15.

## Now
Preparing the move to DigitalOcean (hq `docs/hosting.md` step 4; evanflow-infra brief, Part 1, PLAN A2).
Branch `a2/keyvault-prep`, for a PR into `develop`. Prod and test still run on the homelab, unchanged.

## Done on the branch (not merged)
- Harvested: `54e511e` (`1d6b31f` replayed onto the cloudflared pin `bf0220d`, same patch) and slice 1
  (`878794b`, `af7b9d3`, cherry-picked with `-x`): fail-fast config, no placeholders, unused Auth0 keys
  dropped, `scripts/run-with-keyvault.{sh,ps1}`, gitleaks, our own runner with fork PRs skipped.
- One client image for test and prod: public config read at runtime (`evanbecker-client/env/*.env`).
- Prod Swagger client ID fixed (`JOV7…`; prod offers `J0V7…`, which Auth0 rejects). Auth0 config comes only
  from appsettings now. First API tests.
- Images to GHCR by full SHA; `develop` moves `:test`, `main` moves `:prod` to the image test ran.
- For the droplet's deploy (evanflow-infra `deploy/apps/ebn`): `--migrate-only` and
  `Database__MigrateOnStartup=false` (default unchanged: migrate at startup). API calls send credentials
  through Cloudflare Access, and server-side calls can use `NUXT_API_BASE_SERVER`.

## Checks (2026-11-15, local)
- `dotnet test`: 39 passed. Client: 22 unit tests passed, `nuxt build` passed.
- Client image run as test and as prod: each serves its own canonical URL, payload, robots.txt,
  sitemap.xml and feed.xml; the server-only API address never reaches the browser.
- API image against Postgres 18: `--migrate-only` applies 7 migrations, then reports up to date; an
  unreachable database exits non-zero without the password in the output; `false` leaves an empty database
  empty; unset still migrates at startup.
- Registry-side retag keeps the digest; gitleaks and actionlint clean.
- Not yet: the PR's checks on our runner.

## Blocked
- Key Vault proof run: `scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv` with no `INFISICAL_*` variables, then
  login, comments, contact mail, reCAPTCHA and YouTube search. Waits for the vault (infra P1) and its values.

## Needs Evan
1. Go-ahead to push the branch and open the PR into `develop`.
2. Repo setting: Actions → fork PR workflows → require approval for **all outside collaborators** (today:
   first-time contributors only). The workflow guard alone can be edited away by a fork.
3. After the first GHCR push: make `evanbecker-api` and `evanbecker-client` public.
4. Fill `ef-ebn-tst-eus2-kv`: `ConnectionStrings--Database`, `Email--ApiKey`, `Email--ToAddress`,
   `Recaptcha--SecretKey`, `YouTube--ApiKey`. No `Auth0--*` secrets: that's config now.
5. Later: delete the five `AUTH0_*` keys from Infisical, but only once the homelab runs an API image from this
   branch. The images running today still read them.

## Needs evanflow-infra
- Its `deploy/apps/ebn` client sets only four public values. It also needs `NUXT_PUBLIC_AUTH0_DOMAIN`,
  `_CLIENT_ID`, `_AUDIENCE` and `_RECAPTCHA_SITE_KEY` (the values in `evanbecker-client/env/*.env`), or
  login and the contact form are off.

## Next
- Homelab to GHCR, a `.env` change on the website host: `REGISTRY=ghcr.io/evanflow-studio`, `PROD_TAG=prod`.
- The Key Vault proof run, then the cutover (A3, with evanflow-infra).

## Watch
- Merging into `develop` recreates the two homelab client containers once (same images, same values).
