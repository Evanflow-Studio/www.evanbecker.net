# STATUS: www.evanbecker.net

Rewritten, never appended. Under 60 lines. Last rewrite: 2026-11-17.

## Now
Preparing the move to DigitalOcean (hq `docs/hosting.md` step 4; evanflow-infra brief, Part 1, PLAN A2).
Branch `a2/keyvault-prep`: pushed, PR into `develop` open for Evan's review. Prod and test still run on the
homelab, and merging the PR leaves them as they are (Evan, 11-17).

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
- Removed the ray marcher's audio visualizer, YouTube search and jam sessions (Evan, 11-16). The renderer
  stays. No schema change: sessions were in memory, and their migration is empty.
- The homelab's `docker-compose.production.yaml` is the same as on `develop`, and CI no longer pushes to the
  local registry its Watchtower watches. So a merge changes nothing on the homelab; it keeps today's images.

## Checks (2026-11-16/17, local)
- `dotnet test`: 38 passed. Client: 9 unit tests passed, `nuxt build` passed.
- Client image run as test and as prod: each serves its own URLs; the server-only API address stays out.
- API image against Postgres 18: `--migrate-only`, the startup switch and the default all behave.
- `/sandbox/raymarcher` runs without the audio UI and with no console errors.
- `nuxi typecheck`: 7 errors, all from before this branch (see Next). No ESLint in the repo.
- gitleaks over the branch: no leaks. The branch adds no IPs, guest numbers or hostnames not already public.
- Not yet: the PR's checks on our runner.

## Blocked
- Key Vault proof run: `scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv` with no `INFISICAL_*` variables, then
  login, comments, contact mail and reCAPTCHA. Waits for the vault (infra P1) and its values.

## Needs Evan
1. Review and merge the PR into `develop`. The merge moves `:test` on GHCR, which the droplet's test host pulls.
2. Repo setting: Actions → fork PR workflows → require approval for **all outside collaborators** (today:
   first-time contributors only). The workflow guard alone can be edited away by a fork.
3. After the first GHCR push: make `evanbecker-api` and `evanbecker-client` public.
4. Fill `ef-ebn-tst-eus2-kv`: `Email--ApiKey`, `Email--ToAddress`, `Recaptcha--SecretKey`. evanflow-infra's
   pipeline writes `ConnectionStrings--Database`. No `Auth0--*` or `YouTube--*` secrets.
5. Keep the five `AUTH0_*` keys and `YOUTUBE_API_KEY` in Infisical until it retires at the cutover: the
   homelab's images still read them.

## Needs evanflow-infra
- Its `deploy/apps/ebn` client sets only four public values. It also needs `NUXT_PUBLIC_AUTH0_DOMAIN`,
  `_CLIENT_ID`, `_AUDIENCE` and `_RECAPTCHA_SITE_KEY` (the values in `evanbecker-client/env/*.env`).

## Next
- The Key Vault proof run, then the cutover (A3, with evanflow-infra).
- Proposed: squash the 7 migrations into one, once the homelab databases retire. Typecheck to zero errors.

## Watch
- Any change to `docker-compose.production.yaml` on `develop` reaches the homelab within two minutes. Leave it
  as it is until the cutover unless Evan asks.
