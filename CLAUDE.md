# CLAUDE.md: www.evanbecker.net

Evan's personal site: a Nuxt 3 client and a .NET 10 API. The org rules come from the Evanflow root `CLAUDE.md`;
this file adds only what's true for this repo. State and open work: `STATUS.md`.

## Rules

1. **This repo is public.** No secret values, and nothing internal that isn't already public: no new homelab IPs,
   guest numbers or hostnames. Public config (client IDs, site keys, URLs) is fine and lives in config files.
2. **Ask Evan before any push.** A push to `develop` builds and deploys the test stack, and the homelab applies
   `develop`'s `docker-compose.production.yaml` to prod and test within two minutes. Push only a feature branch, open
   a PR into `develop`, and never merge it. `main` moves only by a PR from `develop`.
3. **Our own runner only** (`[self-hosted, linux, homelab]`), and fork PRs never reach it: every PR job keeps the
   `head.repo.full_name == github.repository` guard. The runner is a container sharing the host's Docker socket, so
   jobs can't bind-mount `$PWD` or reach a container's published port; stream files in or use `docker exec`.
4. **One image for test and prod.** Images are built once per commit to `ghcr.io/evanflow-studio/evanbecker-{api,client}`
   as `:<full sha>`; `develop` moves `:test`, `main` moves `:prod` to the image test ran. Never add an
   environment-specific build arg: the client reads `NUXT_PUBLIC_*` at runtime (`evanbecker-client/env/*.env`).
5. **Secrets vs config.** The API reads secrets as `Section__Key` env vars (Key Vault names `Section--Key`), from
   Infisical until the cutover. Public config, Auth0's included, goes in `appsettings.{Environment}.json`. No
   `<...>` placeholders in any settings file.
6. **Until the cutover** (evanflow-infra A3): Infisical must stay up, and a new secret goes into both Infisical and
   `ef-ebn-{tst,prd}-eus2-kv`. Portfolio content that mentions Infisical stays as it is; that's Evan's call.

## Checks (run before calling anything done)

| What | Command |
|---|---|
| API | `dotnet test` in `evanbecker-api/` |
| Client | `npm run test:unit` and `npm run build` in `evanbecker-client/` |
| One image, both environments | `docker build -t ebn-client evanbecker-client`, then `scripts/smoke-client-image.sh ebn-client` |
| Secrets | the PR's gitleaks job (`.gitleaks.toml` allows three exact public values, nothing else) |

## Map

```
evanbecker-api/            .NET API (evanbecker-api), EF domain (evanbecker-domain), tests (evanbecker-api.Tests)
evanbecker-client/         Nuxt 3 client; env/ holds each environment's public runtime config
  content/articles/        Evan's essays: portfolio content, written with the blog-voice skill
scripts/                   run-with-keyvault.{sh,ps1}, smoke-client-image.sh
infrastructure/            the homelab docs and scripts; they leave this repo after the cutover
.github/workflows/         PR checks, test build (develop), prod promotion (main)
docker-compose.production.yaml   the homelab's compose (the droplet's lives in evanflow-infra)
```

The move to DigitalOcean: `evanflow-infra` `docs/briefs/ebn-keyvault-migration.md` (Part 1 is A2, Part 2 is A3 in
its `docs/PLAN.md`) and the root's `docs/hosting.md`.
