# STATUS: www.evanbecker.net

Rewritten, never appended. Under 60 lines. Last rewrite: 2026-11-15.

## Now
Preparing the move to DigitalOcean (hq `docs/hosting.md` step 4; evanflow-infra brief, Part 1, PLAN A2).
Branch `a2/keyvault-prep`, for a PR into `develop`. Prod and test still run on the homelab, unchanged.

## Done on the branch (not merged)
- Harvested from the old checkout: `54e511e` (PR checks, client unit tests; `1d6b31f` replayed onto the
  cloudflared pin `bf0220d`, same patch) and slice 1 (`878794b`, `af7b9d3`, cherry-picked with `-x`).
- Slice 1: fail-fast config, no placeholders, unused Auth0 keys dropped, `scripts/run-with-keyvault.{sh,ps1}`,
  gitleaks, our own runner with fork PRs skipped.
- Slice 2: the client reads its public config at runtime (`evanbecker-client/env/*.env`), so one image serves
  test and prod. The homelab compose gets the same values the running images have.
- Prod Swagger client ID fixed (`JOV7…`, letter O; prod offers `J0V7…`, which Auth0 rejects). Auth0 config now
  comes only from appsettings, so the vault can't override it. First API tests (`evanbecker-api.Tests`).
- Images to GHCR by full SHA; `develop` moves `:test`, `main` moves `:prod` to the image test ran, no rebuild.
  PR checks now cover PRs into `develop`, smoke-test the client image, and run gitleaks.

## Checks (2026-11-15, local)
- `dotnet test`: 30 passed. Client: 14 unit tests passed, `nuxt build` passed.
- One client image run with `test.env` and `prod.env`: each serves its own canonical URL, robots.txt,
  sitemap.xml and feed.xml. With no env it serves localhost and `noindex`.
- Registry-side retag keeps the digest; gitleaks clean on the branch; actionlint clean.
- Not yet: the PR's checks on our runner.

## Blocked
- Key Vault proof run: `scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv` with no `INFISICAL_*` variables, then
  login, comments, contact mail, reCAPTCHA and YouTube search. Waits for the vault (infra P1) and its values.

## Needs Evan
1. Go-ahead to push the branch and open the PR into `develop`.
2. Repo setting: Actions → fork PR workflows → require approval for **all outside collaborators** (today:
   first-time contributors only). The workflow guard alone can be edited away by a fork.
3. After the first GHCR push: make `evanbecker-api` and `evanbecker-client` public.
4. Fill `ef-ebn-tst-eus2-kv` with the current test values: `ConnectionStrings--Database`, `Email--ApiKey`,
   `Email--ToAddress`, `Recaptcha--SecretKey`, `YouTube--ApiKey`. No `Auth0--*` secrets: that's config now.
5. Later: delete the five `AUTH0_*` keys from Infisical, but only once the homelab runs an API image from this
   branch. The images running today still read them; without them prod would fall back to the dev tenant.

## Next
- Homelab to GHCR, a `.env` change on the website host: `REGISTRY=ghcr.io/evanflow-studio`, `PROD_TAG=prod`.
  Until then a merge builds and promotes on GHCR but doesn't redeploy the homelab.
- The Key Vault proof run, then the cutover (A3, with evanflow-infra).

## Watch
- Merging into `develop` recreates the two homelab client containers once (same images, same values).
