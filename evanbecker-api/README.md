# evanbecker-api

REST API for [www.evanbecker.net](https://www.evanbecker.net) — handles contact form submissions, newsletter subscriptions and user accounts.

## Tech Stack

- **.NET 10** / ASP.NET Core
- **Entity Framework Core** with PostgreSQL 18
- **Auth0** JWT Bearer authentication
- **SMTP2Go** for email notifications (contact form, newsletter)
- **Infisical** for secrets management (via `SecretsConfigurationProvider`)

## Project Structure

```
evanbecker-api/
├── evanbecker-api/              # API project
│   ├── Controllers/             # REST endpoints (Contact, Newsletter, User)
│   ├── Configuration/           # Secrets provider, Auth0/GitHub config models
│   ├── Services/                # Business logic (Users, Newsletter, Email, Recaptcha)
│   ├── Dto/                     # Data transfer objects
│   ├── Extensions/              # WebApplicationExtensions (auto-migrations)
│   └── Program.cs               # App startup & DI
│
└── evanbecker-domain/           # EF Core data layer
    ├── Entities/                # User, ContactMessage, NewsLetterEntry; Comment and Reply are unused, kept for their tables
    ├── Migrations/              # Database migrations
    └── ApplicationContext.cs    # DbContext
```

## API Endpoints

All under `/api/v1/`:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `contact` | POST | No | Submit contact form (with reCAPTCHA) |
| `newsletter` | POST | No | Subscribe to newsletter |
| `user` | GET | Required | Get authenticated user info |
| `user` | POST | Required | Sync/upsert user from Auth0 |
| `user` | PATCH | Required | Update profile (name, avatar) |

Swagger docs available at `/swagger` on any running instance.

### Personal data stays in the API

No public endpoint returns personal data, and the tests fail the build if one could:

- `PersonalDataGuardTests` starts the API inside the test and reads every endpoint it maps, with ApiExplorer's
  description of each. A response may not be an entity from `evanbecker-domain`, and may not have a member named like
  personal data (email, Auth0 ID, `sub`, role flags, password, token, secret, IP, phone, address). An endpoint whose
  body can't be read from its types fails too: `object`, an `IActionResult` with no `[ProducesResponseType]`, an
  anonymous type, or one hidden from ApiExplorer.
- `AnonymousGetTests` seeds a Postgres with personal data in every table and calls every GET without signing in. Open
  ones must answer without an email address or a denied key; signed-in ones must refuse.
- The only exceptions are in `Guard/GuardAllowlist.cs`, each with its reason. Personal data is excused only on an
  endpoint that needs sign-in (the caller's own email on `user`), and an entry that no longer excuses anything fails.

`AnonymousGetTests` starts its own `postgres:18` with Docker, or uses the connection string in `EBN_GUARD_DATABASE`.
CI runs it with `scripts/test-api-with-postgres.sh`.

## Local Development

### Recommended: Database in Docker, API native

```bash
# From repo root — starts just PostgreSQL
docker compose up -d

# Then run the API with hot-reload
cd evanbecker-api/evanbecker-api
dotnet run
```

The connection string in `appsettings.Development.json` points to `localhost:5432` with the user and database from `docker-compose.yaml` (user: `EvanBecker`, db: `evanbecker-db`) and no password. Set `POSTGRES_PASSWORD` in the root `.env` (copy `.env.example`) for the container, and the same value as `PGPASSWORD` for the API, which Npgsql reads when the connection string has no password. Or set the whole connection string with user secrets, below.

### Full Stack in Docker

```bash
# From repo root — starts DB + API + Client
docker compose --profile fullstack up --build
```

API available at `http://localhost:5002`. Migrations auto-apply at container startup.

## Configuration

### Configuration Priority (highest to lowest)

1. **Infisical secrets** — loaded at startup via `SecretsConfigurationProvider` (production/test)
2. **Environment variables** — standard ASP.NET `ASPNETCORE_*` and custom vars
3. **`appsettings.{Environment}.json`** — environment-specific overrides
4. **`appsettings.json`** — base configuration

### Secrets Architecture

The API uses a provider-agnostic secrets system:

- **`ISecretsMapper`** — interface that maps flat secret keys to .NET config paths
- **`InfisicalSecretsMapper`** — Infisical-specific key mapping (the only class that knows Infisical's naming)
- **`SecretsConfigurationProvider`** — pulls secrets from Infisical REST API and applies the mapper

When `INFISICAL_CLIENT_ID` is not set (local dev), the provider skips gracefully and falls back to .NET User Secrets and appsettings files.

### Local Development Secrets

Secrets are stored in .NET User Secrets (never on disk in the project):

```bash
cd evanbecker-api/evanbecker-api
dotnet user-secrets init  # only needed once

# Required — database
dotnet user-secrets set "ConnectionStrings:Database" "Host=localhost;Port=5432;Username=EvanBecker;Password=$POSTGRES_PASSWORD;Database=evanbecker-db"

# Required — Auth0
dotnet user-secrets set "Auth0:Domain" "dev-m3uiopcp.us.auth0.com"
dotnet user-secrets set "Auth0:Audience" "evanbecker.api"
dotnet user-secrets set "Auth0:ClientId" "YOUR_CLIENT_ID"

# Optional — reCAPTCHA (contact form)
dotnet user-secrets set "Recaptcha:SecretKey" "YOUR_RECAPTCHA_SECRET"

# Optional — Email (contact form notifications)
dotnet user-secrets set "Email:ApiKey" "YOUR_SMTP2GO_API_KEY"
dotnet user-secrets set "Email:ToAddress" "you@example.com"
```

User Secrets are stored in `%APPDATA%\Microsoft\UserSecrets\` (Windows) or `~/.microsoft/usersecrets/` (macOS/Linux), completely outside the project tree. No secrets files exist in the repo.

### Secrets Reference

Secrets come from Infisical in production today and move to Azure Key Vault (`ef-ebn-{prd,tst}-eus2-kv`) at the cutover. For local dev, use `dotnet user-secrets`, or run against the test vault with `scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv` (see below).

At startup the API checks these (`Configuration/RequiredConfiguration.cs`). A missing **required** setting stops it with the setting's name, never its value. Missing optional ones are listed and their features stay off. An empty value or a `<...>` placeholder counts as missing.

| Infisical key (today) | Key Vault secret | .NET config path | Required | What happens without it |
|---|---|---|---|---|
| `DB_CONNECTION_STRING` | `ConnectionStrings--Database` (written by evanflow-infra's pipeline) | `ConnectionStrings:Database` | **Yes** | API won't start |
| (not read) | (config, in `appsettings.{Environment}.json`) | `Auth0:Domain` | **Yes** | Auth0 login/JWT validation fails |
| (not read) | (config) | `Auth0:Audience` | **Yes** | JWT validation fails |
| (not read) | (config, public) | `Auth0:ClientId` | **Yes** | Swagger UI OAuth (PKCE) breaks |
| `SMTP2GO_API_KEY` | `Email--ApiKey` | `Email:ApiKey` | No | Contact form emails aren't sent |
| `EMAIL_FROM_ADDRESS` | (config) | `Email:FromAddress` | No | Defaults to `noreply@evanbecker.net` |
| `EMAIL_TO_ADDRESS` | `Email--ToAddress` (or config) | `Email:ToAddress` | No | Contact form emails aren't sent |
| `RECAPTCHA_SECRET_KEY` | `Recaptcha--SecretKey` | `Recaptcha:SecretKey` | No | Contact form submissions are rejected (fails closed) |

Auth0's domain, audience and client ID are public config, so they live in the appsettings files and `InfisicalSecretsMapper` no longer maps `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` or `AUTH0_CLIENT_ID`: a vault value can't override them. Don't add `Auth0--*` secrets to Key Vault. `AUTH0_CLIENT_SECRET` and `AUTH0_URL` were never read (Swagger uses PKCE with the client ID only) and are no longer mapped either. `evanbecker-api.Tests` checks each environment's resolved Auth0 values.

The YouTube search proxy is gone (it served the ray marcher's audio visualizer, which was removed), so `YOUTUBE_API_KEY` is no longer read and there is no `YouTube--ApiKey` secret. The secrets Key Vault holds for the API are `Email--ApiKey`, `Email--ToAddress` and `Recaptcha--SecretKey`; evanflow-infra's pipeline writes `ConnectionStrings--Database`.

**Minimum to run locally:** the database connection string. Auth0's public settings are in `appsettings.json`.

### Running against Key Vault

```bash
az login
scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv          # runs the API with the vault's secrets
scripts/run-with-keyvault.sh ef-ebn-tst-eus2-kv -- env | cut -d= -f1   # or any command
```
The script lists the vault, turns each `Section--Key` into a `Section__Key` environment variable for the child process only, and writes nothing to disk. It needs Key Vault Secrets User (or Officer) on the vault. A PowerShell version is `scripts/run-with-keyvault.ps1`.

### Required Environment Variables (Production/Test)

| Variable | Purpose |
|----------|---------|
| `INFISICAL_CLIENT_ID` | Machine Identity client ID |
| `INFISICAL_CLIENT_SECRET` | Machine Identity secret |
| `INFISICAL_ADDRESS` | Infisical API URL (e.g., `http://192.168.0.107:8080`) |
| `INFISICAL_PROJECT_ID` | Infisical project ID |
| `INFISICAL_ENVIRONMENT` | `prod` or `test` |
| `ASPNETCORE_ENVIRONMENT` | `Production` or `Test` |

### Appsettings Files

| File | Purpose |
|------|---------|
| `appsettings.json` | Base config: the dev Auth0 tenant (also used by test), logging, email sender |
| `appsettings.Development.json` | Local dev (localhost DB connection) |
| `appsettings.Production.json` | The prod Auth0 tenant, audience and Swagger client ID |
| `appsettings.Test.json` | Test's Swagger client ID |

No settings file holds a secret or a `<...>` placeholder; `evanbecker-api.Tests` fails if one comes back. Run the tests with `dotnet test` from `evanbecker-api/`.

## Database

PostgreSQL 18 running in Docker on dedicated LXC containers.

### When migrations run

| How the image runs | What happens |
|---|---|
| Default (the homelab) | The API applies pending migrations at startup, before it listens (`UseLocalDockerMigrationsAsync`, in containers only) |
| `--migrate-only` | Applies pending migrations, logs their names and exits: `0` when the database is up to date, `1` when it isn't. Needs only `ConnectionStrings:Database`. This is the deploy's one-shot `migrate` step (evanflow-infra `deploy/apps/ebn`) |
| `Database__MigrateOnStartup=false` | The API starts without migrating. Set it on the API when the deploy runs `--migrate-only` first |

Migrations must follow expand/contract (evanflow-infra `docs/deployment-strategy.md`, section 3): each one works with both the previous and the next release of the API. `scripts/smoke-api-migrations.sh <api-image>` checks all three modes against a throwaway Postgres 18; the PR checks run it.

### Adding a Migration

```bash
cd evanbecker-domain
dotnet ef migrations add <MigrationName>
```

### Applying Migrations Locally

```bash
cd evanbecker-domain
dotnet ef database update
```

## Deployment

The API is containerized and built by GitHub Actions on our own runner, once per commit, into `ghcr.io/evanflow-studio/evanbecker-api:<sha>`.

- **`develop` branch** → `api-test.evanbecker.net` (moves `:test`)
- **`main` branch** → `api.evanbecker.net` (moves `:prod` to the image test ran; prod on the droplet runs the digest pinned in evanflow-infra)

The homelab (LXC 109) pulls from its local registry, which CI no longer pushes to, so it keeps the images it runs today until the cutover.

No secrets in CI — all secrets are pulled from Infisical at container startup.
