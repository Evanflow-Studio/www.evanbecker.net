# PostgreSQL Docker LXC Setup

Two LXC containers running PostgreSQL 18 via Docker — prod (backed up) and test (ephemeral).

## Quick Start

```bash
# From your dev machine — transfer scripts to Proxmox
scp docs/guides/scripts/setup-db-prod.sh docs/guides/scripts/setup-db-test.sh root@<PROXMOX_IP>:/root/

# On Proxmox host
chmod +x setup-db-prod.sh setup-db-test.sh
./setup-db-prod.sh    # Creates LXC 105, installs Docker + PostgreSQL, creates databases
./setup-db-test.sh    # Creates LXC 106, same but lightweight
```

Each script auto-detects your network, prompts for passwords, and shows a confirmation before doing anything.

## What Gets Created

| | Prod (LXC 105) | Test (LXC 106) |
|---|---|---|
| Hostname | docker-db-prod | docker-db-test |
| Cores / RAM | 2 / 2048 MB | 1 / 1024 MB |
| Disk | 32 GB + ssd1 for PG data | 16 GB (rootfs only) |
| PG tuning | shared_buffers=512MB, 50 conns | shared_buffers=128MB, 20 conns |
| Backups | Daily pg_dump + Proxmox snapshot | None |
| Firewall | Inbound 5432 only, no outbound | Inbound 5432 only, no outbound |
| Internet | Removed after setup | Removed after setup |
| Databases | evanbecker | evanbecker_test |

## Manual Steps After Scripts

**1. Enable firewalls** — Datacenter -> Firewall -> Options -> `Yes`. Then LXC 105 -> Firewall -> Options -> `Yes` (repeat for 106).

**2. Create IP Sets** — Datacenter -> Firewall -> IPSet:

```bash
# List all LXC IPs to know what to add
for ctid in $(pct list | awk 'NR>1 {print $1}'); do
  echo "LXC $ctid ($(pct config $ctid | grep hostname | awk '{print $2}')): $(pct config $ctid | grep net0 | grep -oP 'ip=\K[^/]+')"
done
```

| IP Set | Members |
|---|---|
| `db-prod-clients` | Website LXC (109) |
| `db-test-clients` | Website LXC (109), Proxmox host |

> **Important:** IP sets created at the datacenter level must be referenced with the `dc/` prefix in LXC firewall rules (e.g., `+dc/db-prod-clients`). The scripts handle this automatically.

**3. Proxmox backup for prod** — Datacenter -> Backup -> Add: LXC 105, daily 02:00, ZSTD, 7 daily / 4 weekly / 3 monthly.

## Connection Strings

```bash
echo "Prod: $(pct config 105 | grep net0 | grep -oP 'ip=\K[^/]+')"
echo "Test: $(pct config 106 | grep net0 | grep -oP 'ip=\K[^/]+')"
```

```
Host=<PROD_IP>;Port=5432;Database=evanbecker;Username=evanbecker_app;Password=<PASSWORD>;
Host=<TEST_IP>;Port=5432;Database=evanbecker_test;Username=evanbecker_app;Password=<PASSWORD>;
```

## Maintenance

```bash
# Connect to prod
pct enter 105 && docker exec -it postgres-prod psql -U postgres -d evanbecker

# View logs
pct enter 105 && cd /opt/docker && docker compose logs -f --tail 100

# Restart
pct enter 105 && cd /opt/docker && docker compose restart

# Database sizes
docker exec -it postgres-prod psql -U postgres -c \
  "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC;"

# Reset test (nuclear)
pct enter 106 && cd /opt/docker && docker compose down && rm -rf /opt/pgdata/* && docker compose up -d

# Or destroy and re-run
pct stop 106 && pct destroy 106 && ./setup-db-test.sh
```

### Update PostgreSQL

```bash
# Temporarily enable internet
pct set 105 --nameserver 1.1.1.1
sed -i 's/policy_out: DROP/policy_out: ACCEPT/' /etc/pve/firewall/105.fw

pct enter 105
cd /opt/docker && docker compose pull && docker compose up -d
exit

# Re-lock
pct set 105 --delete nameserver
sed -i 's/policy_out: ACCEPT/policy_out: DROP/' /etc/pve/firewall/105.fw
```

### Add a new database client

1. Get its IP: `pct config <ID> | grep net0 | grep -oP 'ip=\K[^/]+'`
2. Add to the IP Set in Proxmox UI
3. No `pg_hba.conf` needed — Docker PG uses `scram-sha-256` for all host connections

## Troubleshooting

| Problem | Fix |
|---|---|
| "Temporary failure resolving" | LXC missing static IP. Stop it, set `--net0 ...ip=X/24,gw=Y`, set `--nameserver 1.1.1.1`, start |
| Docker won't start | Missing `nesting=1`. Stop LXC, `pct set <ID> --features nesting=1`, start |
| "could not resize shared memory" | Increase `shm_size` in docker-compose.yaml to match `shared_buffers` |
| Can't connect from another LXC | Check IP set membership, firewall config, `ss -tlnp \| grep 5432` |
| PG 18 mount error about `/var/lib/postgresql/data` | Mount must be `/var/lib/postgresql` not `/var/lib/postgresql/data` — PG 18 changed this |
| "Peer authentication failed" | Remove `--auth-local=peer` from `POSTGRES_INITDB_ARGS`, wipe `/opt/pgdata/*`, restart |
| "CREATE DATABASE cannot run inside a transaction" | Run `CREATE USER` and `CREATE DATABASE` as separate `psql -c` commands |
| Script "LXC already exists" | `pct stop <ID> && pct destroy <ID>`, re-run script |

## Files

| File | Location |
|---|---|
| Install scripts | `docs/guides/scripts/setup-db-prod.sh`, `setup-db-test.sh` |
| Docker Compose | `/opt/docker/docker-compose.yaml` (inside LXC) |
| PG data | `/opt/pgdata` (bind mount, survives rebuilds) |
| Backups | `/opt/backups` (prod only, 14 day retention) |
| Firewall | `/etc/pve/firewall/<CTID>.fw` (on Proxmox host) |
