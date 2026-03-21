# CI LXC Setup Guide (Docker Registry + GitHub Actions Runner)

LXC 108 runs the CI/CD infrastructure: a Docker registry (registry:2) for hosting built images locally, and an ephemeral GitHub Actions self-hosted runner. Both run as Docker containers managed by Docker Compose.

## Quick Start

```bash
# From your dev machine — transfer script to Proxmox
scp infrastructure/scripts/setup-ci.sh root@<PROXMOX_IP>:/root/

# On Proxmox host
chmod +x setup-ci.sh
./setup-ci.sh
```

The script will:
- Auto-detect your network (subnet, gateway)
- Prompt for the LXC root password and a GitHub PAT (for runner registration)
- Show a confirmation summary before doing anything
- Create LXC 108 (hostname `ci`, IP `192.168.0.168`), install Docker
- Start registry:2 and a GitHub Actions runner via Docker Compose
- Mount ssd1 for registry storage (falls back to rootfs)
- Configure Proxmox firewall (inbound 5000 from `dc/registry-clients`, outbound ACCEPT)
- Keep internet access (runner needs GitHub, registry serves images)

---

## What Gets Created

| Setting | Value |
|---|---|
| CTID | 108 |
| Hostname | `ci` |
| IP | 192.168.0.168 |
| Cores | 2 |
| Memory | 2048 MB |
| Swap | 512 MB |
| Rootfs | 16 GB on local-lvm |
| Features | nesting=1 (required for Docker) |
| Firewall | Inbound 5000 from dc/registry-clients; outbound ACCEPT |
| Internet | Kept (runner needs GitHub access) |

### Docker Compose services

| Container | Image | Purpose |
|---|---|---|
| `registry` | registry:2 | Local Docker image registry on port 5000 |
| `runner` | myoung34/github-runner:latest | Ephemeral GitHub Actions self-hosted runner |

---

## Manual Steps After Script

### 1. Create the firewall IP Set

The script configures firewall rules but cannot create IP Sets via CLI. In the Proxmox UI:

**Datacenter -> Firewall -> IPSet -> Create:**

| IP Set Name | Members | Purpose |
|---|---|---|
| `registry-clients` | CI LXC (108), Website LXC (109) | Who can pull images from the registry |

> **Important:** IP sets created at the datacenter level must be referenced with the `dc/` prefix in LXC firewall rules (e.g., `+dc/registry-clients`). The script handles this automatically.

### 2. Configure client LXCs to use the registry

On each LXC that needs to pull images from the registry (e.g., LXC 109 website), configure Docker to trust the insecure registry:

```bash
pct enter 109

cat > /etc/docker/daemon.json << 'EOF'
{
  "insecure-registries": ["192.168.0.168:5000"]
}
EOF

systemctl restart docker
```

Then images can be pulled with:

```bash
docker pull 192.168.0.168:5000/evanbecker-api:latest
docker pull 192.168.0.168:5000/evanbecker-client:latest
```

---

## Runner Registration

The runner uses the `myoung34/github-runner` image with the `--ephemeral` flag. It registers with GitHub using the `GITHUB_PAT` provided during setup. The runner:

- Automatically registers on startup
- Runs a single job then exits (ephemeral mode)
- Docker restart policy (`always`) restarts it to pick up the next job
- Uses the repo-level runner group by default

To change the runner configuration, edit `/opt/docker/.env` inside the LXC:

```bash
pct enter 108
nano /opt/docker/.env
cd /opt/docker && docker compose up -d runner
```

---

## Maintenance

### View logs

```bash
pct enter 108
cd /opt/docker

# All services
docker compose logs -f --tail 100

# Specific service
docker compose logs -f registry
docker compose logs -f runner
```

### Restart services

```bash
pct enter 108
cd /opt/docker && docker compose restart
```

### Registry garbage collection

Over time, deleted image tags leave behind unreferenced blobs. Clean them up:

```bash
pct enter 108

# Stop the registry temporarily (GC requires exclusive access)
cd /opt/docker && docker compose stop registry

# Run garbage collection
docker compose run --rm registry garbage-collect /etc/docker/registry/config.yml

# Restart
docker compose start registry
```

### List images in the registry

```bash
curl http://192.168.0.168:5000/v2/_catalog
curl http://192.168.0.168:5000/v2/<image>/tags/list
```

### Update runner or registry images

```bash
pct enter 108
cd /opt/docker && docker compose pull && docker compose up -d
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Runner not picking up jobs | Check `docker compose logs runner` — verify PAT is valid and has `repo` scope |
| Registry unreachable from other LXCs | Check IP set membership, firewall config, `ss -tlnp \| grep 5000` |
| "http: server gave HTTP response to HTTPS client" | Add `insecure-registries` to the client's `/etc/docker/daemon.json` and restart Docker |
| Docker won't start | Missing `nesting=1`. Stop LXC, `pct set 108 --features nesting=1`, start |
| Disk full on registry | Run garbage collection (see above), or expand the ssd1 mount |
| Runner exits immediately | Check GitHub PAT hasn't expired. Regenerate and update `.env` |

---

## File Locations

| File | Location | Purpose |
|---|---|---|
| Install script | `infrastructure/scripts/setup-ci.sh` | Run on Proxmox to create LXC 108 |
| Docker Compose | `/opt/docker/docker-compose.yaml` (inside LXC) | Registry + Runner config |
| Environment file | `/opt/docker/.env` (inside LXC) | GitHub PAT, repo URL |
| Registry data | `/opt/registry-data` (inside LXC) | Image blobs, survives container rebuilds |
| Firewall config | `/etc/pve/firewall/108.fw` (on Proxmox host) | Per-LXC firewall rules |
