# Infisical (Self-Hosted) LXC Setup Guide

A fully self-contained LXC container running Infisical via Docker for centralized secrets management. PostgreSQL and Redis run as sidecar containers — no external database dependency.

## Architecture

```
Proxmox Host
|
+-- LXC 107: infisical
    +-- Docker Compose stack:
    |   +-- infisical/infisical (port 8080)
    |   +-- postgres:16-alpine (internal only, no exposed port)
    |   +-- redis:7-alpine (internal only)
    +-- Data: /opt/pgdata (PostgreSQL), /opt/redis-data (Redis)
    +-- Firewall: inbound 8080 from infisical-clients, outbound blocked
    +-- Completely offline after setup — no internet, no cross-LXC DB traffic
```

---

## Quick Start

### 1. Transfer the script to your Proxmox host

```bash
scp docs/guides/scripts/setup-infisical.sh root@<PROXMOX_IP>:/root/
```

### 2. Run the setup

```bash
ssh root@<PROXMOX_IP>
chmod +x setup-infisical.sh
./setup-infisical.sh
```

The script will:
- Auto-detect your network (subnet, gateway)
- Prompt for passwords (root, Infisical encryption key, auth secret, PG superuser password)
- Show a confirmation summary before doing anything
- Create LXC 107, install Docker, start Infisical + PostgreSQL + Redis
- Configure firewall and remove internet access
- Print a summary with the Infisical URL

### 3. Create the firewall IP Set (manual step)

The script configures firewall rules but cannot create IP Sets via CLI. In the Proxmox UI:

**Datacenter -> Firewall -> IPSet -> Create:**

| IP Set Name | Members | Purpose |
|---|---|---|
| `infisical-clients` | Website LXC (109), CI LXC (108), Dev PC (192.168.0.195) | Who can connect to Infisical |

> **Important:** IP sets created at the datacenter level must be referenced with the `dc/` prefix in LXC firewall rules (e.g., `+dc/infisical-clients`). The scripts handle this automatically.

List your LXC IPs:

```bash
for ctid in $(pct list | awk 'NR>1 {print $1}'); do
  echo "LXC $ctid ($(pct config $ctid | grep hostname | awk '{print $2}')): $(pct config $ctid | grep net0 | grep -oP 'ip=\K[^/]+')"
done
```

---

## Initial Configuration

### 1. Create your admin account

Open `http://<LXC_107_IP>:8080` from a machine whose IP is in the `infisical-clients` IP set. Create your admin account on first visit.

### 2. Create a project

1. Click **Add New Project**
2. Name it `evanbecker-net` (or similar)
3. Add environments: `development`, `test`, `production`
4. Add your secrets (connection strings, Auth0 config, GitHub PAT, etc.)

### 3. Create machine identities for automated access

Machine identities allow the website LXC and CI/CD runner to pull secrets without a human login.

1. Go to **Organization Settings -> Machine Identities**
2. Create identities:
   - `website-prod` — for the production website LXC
   - `website-test` — for the test website LXC
   - `github-runner` — for the CI/CD runner
3. For each identity, create a **Universal Auth** credential
4. Grant each identity access to the appropriate project environments

### 4. Note the credentials

For each machine identity you will get:
- **Client ID**
- **Client Secret**

These are used by the .NET API and Next.js app to authenticate with Infisical.

---

## Pulling Secrets from Applications

### .NET API

Use the [Infisical .NET SDK](https://infisical.com/docs/sdks/languages/csharp):

```bash
cd evanbecker-api/evanbecker-api
dotnet add package Infisical.Sdk
```

```csharp
// Program.cs — pull secrets at startup
using Infisical.Sdk;

var infisical = new InfisicalClient(new ClientSettings
{
    SiteUrl = "http://<LXC_107_IP>:8080",
    Auth = new AuthenticationOptions
    {
        UniversalAuth = new UniversalAuthMethod
        {
            ClientId = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_ID"),
            ClientSecret = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_SECRET"),
        }
    }
});

var secrets = infisical.ListSecrets(new ListSecretsOptions
{
    ProjectId = "<your-project-id>",
    Environment = "production",
    SecretPath = "/"
});

foreach (var secret in secrets)
{
    Environment.SetEnvironmentVariable(secret.SecretKey, secret.SecretValue);
}
```

The only environment variables the containers need are `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, and optionally `INFISICAL_SITE_URL`. Everything else comes from Infisical.

### Next.js Client

Use the [Infisical Node SDK](https://infisical.com/docs/sdks/languages/node):

```bash
cd evanbecker-client
npm install @infisical/sdk
```

```typescript
// lib/infisical.ts
import { InfisicalSDK } from "@infisical/sdk";

const client = new InfisicalSDK({
  siteUrl: process.env.INFISICAL_SITE_URL || "http://<LXC_107_IP>:8080",
});

await client.auth().universalAuth.login({
  clientId: process.env.INFISICAL_CLIENT_ID!,
  clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
});

const secrets = await client.secrets().listSecrets({
  projectId: "<your-project-id>",
  environment: "production",
  secretPath: "/",
});
```

### Docker Compose (CI/CD)

The runner can use the Infisical CLI to inject secrets into docker compose:

```bash
# Install Infisical CLI on the runner
# Then in the deploy script:
infisical run --env=production --projectId=<id> -- docker compose up -d
```

---

## Maintenance

### View logs

```bash
pct enter 107
cd /opt/docker && docker compose logs -f --tail 100

# Specific service
docker compose logs -f infisical
docker compose logs -f postgres
docker compose logs -f redis
```

### Restart Infisical

```bash
pct enter 107
cd /opt/docker && docker compose restart
```

### Backup Infisical data

The PostgreSQL data lives at `/opt/pgdata` inside the LXC. Back it up with Proxmox snapshots or:

```bash
# From Proxmox host — dump the database
pct exec 107 -- docker exec infisical-postgres pg_dump -U postgres infisical > /root/infisical-backup.sql
```

### Update Infisical image

```bash
# On Proxmox host — temporarily enable internet
pct set 107 --nameserver 1.1.1.1
sed -i 's/policy_out: DROP/policy_out: ACCEPT/' /etc/pve/firewall/107.fw

# Inside the LXC
pct enter 107
cd /opt/docker && docker compose pull && docker compose up -d

# Re-lock on Proxmox host
pct set 107 --delete nameserver
sed -i 's/policy_out: ACCEPT/policy_out: DROP/' /etc/pve/firewall/107.fw
```

---

## Firewall Notes

Outbound traffic is blocked after setup. Infisical may need outbound access for:
- **Email notifications** (SMTP) — if you configure email alerts
- **Integrations** (AWS, GCP, etc.) — if you use native secret syncing
- **Telemetry** — Infisical phones home by default (set `TELEMETRY_ENABLED=false` to disable)

If you need any of these features, selectively allow outbound traffic to specific destinations rather than opening outbound entirely.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Infisical won't start / DB errors | `docker compose logs postgres` — check PG is healthy. Wipe and restart: `docker compose down && rm -rf /opt/pgdata/* && docker compose up -d` |
| "Temporary failure resolving" during setup | LXC missing static IP or DNS. See database guide troubleshooting |
| Docker won't start | Missing `nesting=1`. Stop LXC, `pct set 107 --features nesting=1`, start |
| Can't connect from another LXC | Check IP set membership, firewall config, `pct exec 107 -- ss -tlnp \| grep 8080` |
| PG mount error about `/var/lib/postgresql/data` | Mount must be `/var/lib/postgresql` not `/var/lib/postgresql/data` if using PG 18. Script uses PG 16 to avoid this |

---

## File Locations

| File | Location | Purpose |
|---|---|---|
| Install script | `docs/guides/scripts/setup-infisical.sh` | Run on Proxmox to create LXC 107 |
| Docker Compose | `/opt/docker/docker-compose.yaml` (inside LXC) | Infisical + PostgreSQL + Redis config |
| Environment file | `/opt/docker/.env` (inside LXC) | Encryption key, DB password, auth secret |
| PG data | `/opt/pgdata` (inside LXC) | PostgreSQL data, survives container rebuilds |
| Firewall config | `/etc/pve/firewall/107.fw` (on Proxmox host) | Per-LXC firewall rules |
