# evanbecker-api

REST API for [www.evanbecker.net](https://www.evanbecker.net) — handles comments, contact form submissions, newsletter subscriptions, and user management.

## Tech Stack

- **.NET 10** / ASP.NET Core
- **Entity Framework Core** with PostgreSQL 18
- **Auth0** JWT Bearer authentication
- **Infisical** for secrets management (via `SecretsConfigurationProvider`)

## Project Structure

```
evanbecker-api/
├── evanbecker-api/              # API project
│   ├── Controllers/             # REST endpoints (Comment, Contact, Newsletter, User)
│   ├── Configuration/           # Secrets provider, Auth0/GitHub config models
│   ├── Services/                # Business logic (Comments, Users, Email, Recaptcha)
│   ├── Dto/                     # Data transfer objects
│   ├── Extensions/              # WebApplicationExtensions (auto-migrations)
│   └── Program.cs               # App startup & DI
│
└── evanbecker-domain/           # EF Core data layer
    ├── Entities/                # Comment, User, ContactMessage, NewsLetterEntry, Reply
    ├── Migrations/              # Database migrations
    └── ApplicationContext.cs    # DbContext
```

## API Endpoints

All under `/api/v1/`:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `comment/{targetLocation}` | GET | No | Fetch page comments |
| `comment/{targetLocation}` | POST | Required | Create comment |
| `comment/{targetLocation}/reply/{commentId}` | POST | Required | Reply to comment |
| `comment/{id}` | DELETE | Required | Soft-delete comment |
| `contact` | POST | No | Submit contact form (with reCAPTCHA) |
| `newsletter` | POST | No | Subscribe to newsletter |
| `user` | GET | Required | Get authenticated user info |

Swagger docs available at `/swagger` on any running instance.

## Local Development

### Standalone

```bash
cd evanbecker-api
dotnet run
```

Requires a local PostgreSQL instance. Configure connection string in `appsettings.Development.json`.

### With Docker Compose (from repo root)

```bash
docker compose up --build
```

This starts PostgreSQL + the API together. The API is available at `http://localhost:5002`.

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

When `INFISICAL_CLIENT_ID` is not set (local dev), the provider skips gracefully and falls back to local config files.

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
| `appsettings.json` | Base config (Auth0 defaults, logging, GitHub org) |
| `appsettings.Development.json` | Local dev (localhost DB connection) |
| `appsettings.Production.json` | Production overrides (minimal — Infisical handles secrets) |
| `appsettings.Test.json` | Test environment overrides |

## Database

PostgreSQL 18 running in Docker on dedicated LXC containers. Migrations run automatically at startup via `WebApplicationExtensions.UseLocalDockerMigrationsAsync()`.

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

The API is containerized and deployed via GitHub Actions → self-hosted runner → local Docker registry → Watchtower auto-pull on LXC 109.

- **`develop` branch** → `api-test.evanbecker.net` (image tag `:test`)
- **`main` branch** → `api.evanbecker.net` (image tag `:latest`)

No secrets in CI — all secrets are pulled from Infisical at container startup.
