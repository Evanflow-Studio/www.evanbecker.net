# evanbecker-api

REST API for [www.evanbecker.net](https://www.evanbecker.net) — handles comments, contact form submissions, newsletter subscriptions, user management, YouTube search proxy, and real-time features via SignalR.

## Tech Stack

- **.NET 10** / ASP.NET Core
- **Entity Framework Core** with PostgreSQL 18
- **Auth0** JWT Bearer authentication
- **SignalR** for real-time comments and multiplayer jam sessions
- **SMTP2Go** for email notifications (contact form, newsletter)
- **YouTube Data API v3** for search (proxied to keep key server-side)
- **Infisical** for secrets management (via `SecretsConfigurationProvider`)

## Project Structure

```
evanbecker-api/
├── evanbecker-api/              # API project
│   ├── Controllers/             # REST endpoints (Comment, Contact, Newsletter, User, YouTube)
│   ├── Configuration/           # Secrets provider, Auth0/GitHub config models
│   ├── Services/                # Business logic (Comments, Users, Email, Recaptcha, YouTube)
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
| `user` | POST | Required | Sync/upsert user from Auth0 |
| `user` | PATCH | Required | Update profile (name, avatar) |
| `youtube/search?q={query}` | GET | No | Search YouTube catalog (proxied) |
| `youtube/video/{videoId}` | GET | No | Get video metadata (cached 24h) |

Swagger docs available at `/swagger` on any running instance.

## Local Development

### Recommended: Database in Docker, API native

```bash
# From repo root — starts just PostgreSQL
docker compose up -d

# Then run the API with hot-reload
cd evanbecker-api/evanbecker-api
dotnet run
```

The connection string in `appsettings.Development.json` points to `localhost:5432` with credentials matching `docker-compose.yaml` (user: `EvanBecker`, password: `P@55W0RD123`, db: `evanbecker-db`). No `.env` file needed.

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
dotnet user-secrets set "ConnectionStrings:Database" "Host=localhost;Port=5432;Username=EvanBecker;Password=P@55W0RD123;Database=evanbecker-db"

# Required — Auth0
dotnet user-secrets set "Auth0:Domain" "dev-m3uiopcp.us.auth0.com"
dotnet user-secrets set "Auth0:Audience" "evanbecker.api"
dotnet user-secrets set "Auth0:ClientId" "YOUR_CLIENT_ID"
dotnet user-secrets set "Auth0:ClientSecret" "YOUR_CLIENT_SECRET"
dotnet user-secrets set "Auth0:Url" "https://dev-m3uiopcp.us.auth0.com"

# Optional — YouTube (ray marcher music search)
dotnet user-secrets set "YouTube:ApiKey" "YOUR_YOUTUBE_DATA_API_KEY"

# Optional — reCAPTCHA (contact form)
dotnet user-secrets set "Recaptcha:SecretKey" "YOUR_RECAPTCHA_SECRET"

# Optional — Email (contact form notifications)
dotnet user-secrets set "Email:ApiKey" "YOUR_SMTP2GO_API_KEY"
dotnet user-secrets set "Email:ToAddress" "you@example.com"
```

User Secrets are stored in `%APPDATA%\Microsoft\UserSecrets\` (Windows) or `~/.microsoft/usersecrets/` (macOS/Linux), completely outside the project tree. No secrets files exist in the repo.

### Secrets Reference

All secrets managed via Infisical in production. For local dev, use `dotnet user-secrets`.

| Infisical Key | .NET Config Path | Required | What happens without it |
|---------------|-----------------|----------|------------------------|
| `DB_CONNECTION_STRING` | `ConnectionStrings:Database` | **Yes** | API won't start (no database) |
| `AUTH0_DOMAIN` | `Auth0:Domain` | **Yes** | Auth0 login/JWT validation fails |
| `AUTH0_AUDIENCE` | `Auth0:Audience` | **Yes** | JWT validation fails |
| `AUTH0_CLIENT_ID` | `Auth0:ClientId` | **Yes** | Swagger UI OAuth flow breaks |
| `AUTH0_CLIENT_SECRET` | `Auth0:ClientSecret` | **Yes** | User profile sync fails |
| `AUTH0_URL` | `Auth0:Url` | **Yes** | Swagger UI OAuth redirect fails |
| `SMTP2GO_API_KEY` | `Email:ApiKey` | No | Contact form emails won't send |
| `EMAIL_FROM_ADDRESS` | `Email:FromAddress` | No | Defaults to `noreply@evanbecker.net` |
| `EMAIL_TO_ADDRESS` | `Email:ToAddress` | No | Contact form emails won't send |
| `RECAPTCHA_SECRET_KEY` | `Recaptcha:SecretKey` | No | Contact form submits without verification |
| `YOUTUBE_API_KEY` | `YouTube:ApiKey` | No | YouTube search disabled (file upload still works) |

**Minimum to run locally:** `DB_CONNECTION_STRING` + Auth0 secrets. Everything else degrades gracefully.

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
