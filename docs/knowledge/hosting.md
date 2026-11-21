---
id: ebn.hosting
kind: goal
title: The site builds once, deploys the same image everywhere, and migrates safely
summary: One image per commit, test behind Access, secrets from Key Vault, and migrations before start.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [org.goal.website-on-digitalocean, ebn.security]
---

How the site is built and run: `.github/workflows/`, the Dockerfiles, `scripts/` and the deploy in evanflow-infra.
The move to DigitalOcean is the org goal `org.goal.website-on-digitalocean`.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.hosting.droplet` | infrastructure | Prod and test run on the DigitalOcean droplet, with their databases in the shared managed Postgres cluster, a database and login each | none |
| `ebn.hosting.homelab-serves-nothing` | infrastructure | Once the cutover is done, nothing of the site is served from the homelab, not even through a tunnel | none |
| `ebn.hosting.homelab-untouched` | decision | Until the cutover, a merge into `develop` changes nothing on the homelab: its `docker-compose.production.yaml` stays as it is (Evan, 11-17) | none |
| `ebn.hosting.test-access` | infrastructure | Test is served only behind Cloudflare Access, so nothing reaches it before sign-in | none |
| `ebn.hosting.one-image` | architecture | One client image serves test and prod; each environment's public values are read at runtime, and no build argument is environment-specific | `scripts/smoke-client-image.sh` |
| `ebn.hosting.server-address` | behaviour | Server-side API calls can use `NUXT_API_BASE_SERVER`, which never reaches the browser | `apiBase.test.ts › resolveApiBase › uses the public URL in the browser, without a trailing slash`, `scripts/smoke-client-image.sh` |
| `ebn.hosting.credentials` | infrastructure | Every API call from the browser sends credentials, so Cloudflare Access on test accepts it | `apiBase.test.ts › apiRequestDefaults › sends credentials cross-origin, so Cloudflare Access on test gets its cookie`, `apiBase.test.ts › every call site › sends apiRequestDefaults with every /api/v1 call` |
| `ebn.hosting.build-once` | infrastructure | Each commit's API and client images are built once, on our own runner, and pushed to GHCR as `:<full sha>` | none |
| `ebn.hosting.promote` | infrastructure | A push to `develop` moves `:test`; a push to `main` moves `:prod` to the exact image test ran, without rebuilding | none |
| `ebn.hosting.secrets` | infrastructure | The API reads its secrets as `Section__Key` environment variables, written from Key Vault by the host's secrets sync | none |
| `ebn.hosting.migrate-only` | behaviour | `--migrate-only` applies every pending migration and exits; a second run changes nothing | `DatabaseMigrationsTests.Recognises_migrate_only_and_keeps_it_from_the_host`, `DatabaseMigrationsTests.Migrate_only_needs_just_the_database`, `scripts/smoke-api-migrations.sh` |
| `ebn.hosting.migrate-before-start` | infrastructure | On the droplet, migrations run as a one-shot step before the API starts with `Database__MigrateOnStartup=false` | `DatabaseMigrationsTests.Database_MigrateOnStartup_switches_it`, `DatabaseMigrationsTests.Reads_the_switch_from_its_environment_variable_name`, `scripts/smoke-api-migrations.sh` |
| `ebn.hosting.migrate-default` | behaviour | With the switch unset, the API migrates at startup, as the homelab expects | `DatabaseMigrationsTests.Migrates_on_startup_by_default` |
| `ebn.hosting.migrate-fails-quietly` | behaviour | `--migrate-only` exits 1 when the database is unreachable, without printing the connection string | `DatabaseMigrationsTests.Migrate_only_exits_1_when_the_database_is_unreachable_without_printing_the_connection_string`, `DatabaseMigrationsTests.Migrate_only_still_needs_the_database` |
| `ebn.hosting.expand-contract` | architecture | Every migration is expand/contract, so the running version keeps working while the next one migrates | none |
| `ebn.hosting.docs` | docs | The READMEs say where and how the site runs today, and a change to hosting updates them in the same pull request | none |
| `ebn.hosting.health` | behaviour | The API answers `/health`, which deploys and the smoke script wait on | `scripts/smoke-api-migrations.sh` |
