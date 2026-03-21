# Infrastructure

Self-hosted Proxmox homelab running the full www.evanbecker.net stack. Zero open ports — all ingress via Cloudflare Tunnel.

## LXC Containers

| CTID | Hostname | IP | Purpose | Resources |
|------|----------|-----|---------|-----------|
| 105 | docker-db-prod | 192.168.0.105 | PostgreSQL 18 (prod DB) | 2 cores, 2GB, 32GB + ssd1 |
| 106 | docker-db-test | 192.168.0.106 | PostgreSQL 18 (test DB) | 1 core, 1GB, 16GB |
| 107 | infisical | 192.168.0.107 | Infisical + PG 16 + Redis | 2 cores, 2GB, 16GB |
| 108 | ci | 192.168.0.168 | Docker Registry + GitHub Actions Runner | 2 cores, 2GB, 16GB |
| 109 | website | 192.168.0.169 | Traefik + app containers + cloudflared + Watchtower + Uptime Kuma | 4 cores, 4GB, 32GB |

## Services on LXC 109

All defined in [`docker-compose.production.yaml`](../docker-compose.production.yaml):

| Container | Image | Hostname | Purpose |
|-----------|-------|----------|---------|
| traefik | traefik:latest | — | Reverse proxy, routes by hostname |
| evanbecker-api-prod | registry/evanbecker-api:latest | api.evanbecker.net | Production API |
| evanbecker-client-prod | registry/evanbecker-client:latest | www.evanbecker.net | Production frontend |
| evanbecker-api-test | registry/evanbecker-api:test | api-test.evanbecker.net | Test API |
| evanbecker-client-test | registry/evanbecker-client:test | test.evanbecker.net | Test frontend |
| uptime-kuma | louislam/uptime-kuma:1 | health.evanbecker.net / monitoring.evanbecker.net | Status page + monitoring dashboard |
| cloudflared | cloudflare/cloudflared:latest | — | Tunnel to Cloudflare edge |
| watchtower | containrrr/watchtower | — | Auto-deploys new images from registry |

## Deployment

### Branch Strategy

| Branch | Deploys To | Image Tag | URL |
|--------|-----------|-----------|-----|
| `develop` | Test | `:test` | test.evanbecker.net / api-test.evanbecker.net |
| `main` | Production | `:latest` | www.evanbecker.net / api.evanbecker.net |

### How It Works

1. Developer pushes to `develop` or `main`
2. Self-hosted runner (LXC 108) builds Docker images and pushes to local registry
3. Watchtower (LXC 109) detects new image within 30s, pulls and restarts the container
4. The .NET API pulls its own secrets from Infisical at startup — no secrets in CI or compose files
5. EF Core migrations run automatically at container startup

### Compose Sync

A cron job on LXC 109 runs every 2 minutes to sync infrastructure changes:

```bash
# /opt/docker/sync.sh — checks for compose file updates
cd /opt/app
git fetch origin develop --quiet
if [ LOCAL != REMOTE ]; then
    git reset --hard origin/develop
    docker compose -f docker-compose.production.yaml --env-file /opt/docker/.env up -d --remove-orphans
fi
```

This means changes to `docker-compose.production.yaml` (adding services, changing labels, etc.) auto-deploy without SSH.

### File Locations on LXC 109

| Path | Purpose |
|------|---------|
| `/opt/app/` | Git clone of this repo |
| `/opt/app/docker-compose.production.yaml` | Production compose file (from repo) |
| `/opt/docker/.env` | Runtime secrets (Infisical bootstrap vars, tunnel token, registry) |
| `/opt/docker/sync.sh` | Compose sync script (cron runs every 2 min) |

### Required `.env` Variables (LXC 109)

```env
REGISTRY=192.168.0.168:5000
LXC_IP=192.168.0.169
INFISICAL_CLIENT_ID=...
INFISICAL_CLIENT_SECRET=...
INFISICAL_ADDRESS=http://192.168.0.107:8080
INFISICAL_PROJECT_ID=...
TUNNEL_TOKEN=...
```

## Secrets (Infisical)

The .NET API connects to Infisical at startup via a custom `IConfigurationProvider`. Secrets are mapped from flat Infisical keys to .NET configuration paths:

| Infisical Key | .NET Config Path | Purpose |
|---------------|-----------------|---------|
| `DB_CONNECTION_STRING` | `ConnectionStrings:Database` | PostgreSQL connection string |
| `AUTH0_DOMAIN` | `Auth0:Domain` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | `Auth0:Audience` | Auth0 API identifier |
| `AUTH0_CLIENT_ID` | `Auth0:ClientId` | Auth0 client ID |
| `AUTH0_CLIENT_SECRET` | `Auth0:ClientSecret` | Auth0 client secret |
| `AUTH0_URL` | `Auth0:Url` | Auth0 base URL |

### Auth0 Tenants

| Environment | Domain | Audience |
|-------------|--------|----------|
| Production | evanbecker.us.auth0.com | api.evanbecker.net |
| Test | dev-m3uiopcp.us.auth0.com | evanbecker.api |

## Monitoring

**Uptime Kuma** monitors all services and exposes two views:

- **health.evanbecker.net** — Public status page (redirects to `/status/main`)
- **monitoring.evanbecker.net** — Admin dashboard (password-protected)

Monitors: Website (prod/test), API (prod/test), Database (prod/test), Infisical, Docker Registry.

## Setup Guides

Step-by-step guides for provisioning each LXC from scratch:

- [Database LXC Setup](database-lxc-setup.md) — PostgreSQL 18 on LXC 105/106
- [Infisical LXC Setup](infisical-lxc-setup.md) — Self-hosted secrets manager on LXC 107
- [CI LXC Setup](ci-lxc-setup.md) — GitHub Actions runner + Docker Registry on LXC 108
- [Website LXC Setup](website-lxc-setup.md) — Full app stack on LXC 109

One-shot install scripts (run on Proxmox host): [`scripts/`](scripts/)

## Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [001](adr/001-proxmox-lxc-over-vms.md) | LXC containers over KVM VMs |
| [002](adr/002-infisical-for-secrets.md) | Self-hosted Infisical for secrets |
| [003](adr/003-cloudflare-tunnel-per-service.md) | Cloudflare Tunnel for ingress |
| [004](adr/004-watchtower-for-deploys.md) | Watchtower for zero-SSH deploys |
| [005](adr/005-repo-split-app-vs-infra.md) | Future repo split (app vs infra) |
| [006](adr/006-self-hosted-runner-with-registry.md) | Self-hosted runner + local registry |

## Network Security

```
Internet → Cloudflare (TLS, DDoS, CDN) → Tunnel → LXC 109 (Traefik)

LXC 109 → LXC 105 (tcp/5432, prod DB)
LXC 109 → LXC 106 (tcp/5432, test DB)
LXC 109 → LXC 107 (tcp/8080, Infisical)
LXC 109 ← LXC 108 (pull images from registry)

LXC 105/106: No DNS, no internet. Inbound 5432 only from IP set.
LXC 107: No DNS after setup. Inbound 8080 only from IP set.
```

Firewall IP sets are managed at Datacenter level in Proxmox UI.
