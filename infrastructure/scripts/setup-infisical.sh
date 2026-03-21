#!/bin/bash
#
# setup-infisical.sh
# Run this ON YOUR PROXMOX HOST to create and configure the Infisical secrets manager LXC.
#
# Usage:
#   chmod +x setup-infisical.sh
#   ./setup-infisical.sh
#
# What it does:
#   1. Detects your network (subnet, gateway)
#   2. Creates LXC container with Docker support
#   3. Installs Docker + Docker Compose inside it
#   4. Starts Infisical + PostgreSQL (sidecar) + Redis via Docker Compose
#   5. Configures Proxmox firewall (inbound 8080 only, no outbound)
#   6. Removes internet access
#
# Self-contained: PostgreSQL runs as a sidecar container inside this LXC.
# No dependency on any external database.
#
set -euo pipefail

# ─────────────────────────────────────────────
# Configuration — edit these to match your setup
# ─────────────────────────────────────────────
CTID=107
HOSTNAME="infisical"
CORES=2
MEMORY=2048
SWAP=512
DISK_SIZE=16           # GB, for the rootfs
STORAGE="local-lvm"    # rootfs storage

# ─────────────────────────────────────────────
# Auto-detect network
# ─────────────────────────────────────────────
echo "=== Detecting network configuration ==="

BRIDGE="vmbr0"
HOST_IP=$(ip addr show $BRIDGE | grep "inet " | awk '{print $2}' | cut -d/ -f1)
SUBNET_PREFIX=$(echo "$HOST_IP" | cut -d. -f1-3)
GATEWAY=$(ip route | grep default | awk '{print $3}')
LXC_IP="${SUBNET_PREFIX}.${CTID}"

if [ -z "$HOST_IP" ] || [ -z "$GATEWAY" ]; then
    echo "ERROR: Could not detect network on bridge $BRIDGE"
    echo "  Host IP: $HOST_IP"
    echo "  Gateway: $GATEWAY"
    echo "Edit BRIDGE variable if your bridge is not vmbr0"
    exit 1
fi

echo "  Host IP:    $HOST_IP"
echo "  Gateway:    $GATEWAY"
echo "  Subnet:     ${SUBNET_PREFIX}.0/24"
echo "  LXC IP:     $LXC_IP"
echo ""

# Check if IP is in use
if ping -c 1 -W 1 "$LXC_IP" &>/dev/null; then
    echo "WARNING: $LXC_IP appears to be in use!"
    read -p "Continue anyway? (y/N): " confirm
    [ "$confirm" = "y" ] || exit 1
fi

# ─────────────────────────────────────────────
# Check prerequisites
# ─────────────────────────────────────────────
echo "=== Checking prerequisites ==="

# Check if CTID already exists
if pct status $CTID &>/dev/null; then
    echo "ERROR: LXC $CTID already exists!"
    echo "  Status: $(pct status $CTID)"
    echo "  To destroy it: pct stop $CTID && pct destroy $CTID"
    exit 1
fi

# Find a Debian template
TEMPLATE=$(ls /var/lib/vz/template/cache/debian-12-standard* 2>/dev/null | head -1)
if [ -z "$TEMPLATE" ]; then
    echo "No Debian 12 template found. Downloading..."
    pveam update
    TEMPLATE_NAME=$(pveam available --section system | grep "debian-12-standard" | awk '{print $2}' | tail -1)
    if [ -z "$TEMPLATE_NAME" ]; then
        echo "ERROR: Could not find debian-12-standard template to download"
        exit 1
    fi
    pveam download local "$TEMPLATE_NAME"
    TEMPLATE="/var/lib/vz/template/cache/${TEMPLATE_NAME}"
fi

TEMPLATE_SHORT="local:vztmpl/$(basename "$TEMPLATE")"
echo "  Template: $TEMPLATE_SHORT"
echo "  Storage:  $STORAGE"

# ─────────────────────────────────────────────
# Prompt for passwords and secrets
# ─────────────────────────────────────────────
echo ""
echo "=== Password and secret configuration ==="

read -sp "Root password for LXC container: " ROOT_PASSWORD
echo ""
read -sp "Infisical ENCRYPTION_KEY (32+ char hex string, generate with: openssl rand -hex 16): " ENCRYPTION_KEY
echo ""
read -sp "Infisical AUTH_SECRET (generate with: openssl rand -base64 32): " AUTH_SECRET
echo ""
read -sp "PostgreSQL password (for the sidecar database): " PG_PASSWORD
echo ""

# ─────────────────────────────────────────────
# Confirm before proceeding
# ─────────────────────────────────────────────
echo ""
echo "=== Ready to create LXC $CTID ==="
echo "  Hostname:   $HOSTNAME"
echo "  IP:         $LXC_IP/24"
echo "  Gateway:    $GATEWAY"
echo "  Cores:      $CORES"
echo "  Memory:     ${MEMORY}MB"
echo "  Disk:       ${DISK_SIZE}GB on $STORAGE"
echo "  Database:   PostgreSQL 16 sidecar (internal, no exposed port)"
echo "  Redis:      redis:7-alpine sidecar (internal)"
echo ""
read -p "Proceed? (y/N): " confirm
[ "$confirm" = "y" ] || exit 0

# ─────────────────────────────────────────────
# Step 1: Create the LXC container
# ─────────────────────────────────────────────
echo ""
echo "=== Step 1/6: Creating LXC container ==="

pct create $CTID "$TEMPLATE_SHORT" \
    --hostname "$HOSTNAME" \
    --cores $CORES \
    --memory $MEMORY \
    --swap $SWAP \
    --storage $STORAGE \
    --rootfs ${STORAGE}:${DISK_SIZE} \
    --net0 name=eth0,bridge=$BRIDGE,firewall=1,type=veth,ip=${LXC_IP}/24,gw=${GATEWAY} \
    --nameserver 1.1.1.1 \
    --unprivileged 1 \
    --features nesting=1 \
    --start 0 \
    --password "$ROOT_PASSWORD"

echo "  LXC $CTID created"

# ─────────────────────────────────────────────
# Step 2: Start and configure OS
# ─────────────────────────────────────────────
echo ""
echo "=== Step 2/6: Starting container and configuring OS ==="

pct start $CTID

# Wait for container to be fully up
sleep 3

# Fix locale
pct exec $CTID -- bash -c "
    apt-get update -qq
    apt-get install -y -qq locales >/dev/null 2>&1
    sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
    locale-gen >/dev/null 2>&1
    update-locale LANG=en_US.UTF-8
"
echo "  Locale configured"

# Install basics
pct exec $CTID -- bash -c "
    apt-get upgrade -y -qq >/dev/null 2>&1
    apt-get install -y -qq curl wget ca-certificates gnupg lsb-release sudo htop >/dev/null 2>&1
    timedatectl set-timezone America/Chicago
"
echo "  Base packages installed"

# ─────────────────────────────────────────────
# Step 3: Install Docker
# ─────────────────────────────────────────────
echo ""
echo "=== Step 3/6: Installing Docker ==="

pct exec $CTID -- bash -c "
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \$(. /etc/os-release && echo \$VERSION_CODENAME) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
"

# Verify
DOCKER_VERSION=$(pct exec $CTID -- docker --version 2>/dev/null || echo "FAILED")
echo "  Docker installed: $DOCKER_VERSION"

# ─────────────────────────────────────────────
# Step 4: Create Docker Compose config
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4/6: Creating Docker Compose configuration ==="

pct exec $CTID -- mkdir -p /opt/docker /opt/pgdata /opt/redis-data

# Write docker-compose.yaml — fully self-contained with PG + Redis sidecars
pct exec $CTID -- bash -c "cat > /opt/docker/docker-compose.yaml << 'COMPOSEFILE'
services:
  infisical:
    image: infisical/infisical:latest
    container_name: infisical
    restart: always
    ports:
      - \"LXC_IP_PLACEHOLDER:8080:8080\"
    environment:
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY}
      - AUTH_SECRET=\${AUTH_SECRET}
      - DB_CONNECTION_URI=postgres://infisical:\${PG_PASSWORD}@postgres:5432/infisical
      - REDIS_URL=redis://redis:6379
      - SITE_URL=http://LXC_IP_PLACEHOLDER:8080
      - TELEMETRY_ENABLED=false
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:16-alpine
    container_name: infisical-postgres
    restart: always
    volumes:
      - /opt/pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: infisical
      POSTGRES_USER: infisical
      POSTGRES_PASSWORD: \${PG_PASSWORD}
    healthcheck:
      test: [\"CMD-SHELL\", \"pg_isready -U infisical -d infisical\"]
      interval: 5s
      timeout: 5s
      retries: 10
    shm_size: 128mb

  redis:
    image: redis:7-alpine
    container_name: infisical-redis
    restart: always
    volumes:
      - /opt/redis-data:/data
COMPOSEFILE"

# Inject the actual LXC IP into the compose file
pct exec $CTID -- bash -c "
    MY_IP=\$(ip addr show eth0 | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1)
    sed -i \"s/LXC_IP_PLACEHOLDER/\$MY_IP/g\" /opt/docker/docker-compose.yaml
    echo \"Bound to: \$MY_IP:8080\"
"

# Write .env file with secrets
pct exec $CTID -- bash -c "
    cat > /opt/docker/.env << ENVFILE
ENCRYPTION_KEY=${ENCRYPTION_KEY}
AUTH_SECRET=${AUTH_SECRET}
PG_PASSWORD=${PG_PASSWORD}
ENVFILE
    chmod 600 /opt/docker/.env
"
echo "  Docker Compose config created (Infisical + PostgreSQL 16 + Redis)"

# ─────────────────────────────────────────────
# Step 5: Start Infisical
# ─────────────────────────────────────────────
echo ""
echo "=== Step 5/6: Starting Infisical ==="

pct exec $CTID -- bash -c "cd /opt/docker && docker compose up -d"

# Wait for Infisical to be ready
echo "  Waiting for Infisical to initialize..."
for i in $(seq 1 60); do
    if pct exec $CTID -- bash -c "curl -sf http://localhost:8080/api/status >/dev/null 2>&1"; then
        break
    fi
    sleep 2
    printf "."
done
echo ""

# Check if services are running
INFISICAL_STATUS=$(pct exec $CTID -- docker ps --filter name=infisical --format "{{.Names}}: {{.Status}}" 2>/dev/null | head -1 || echo "UNKNOWN")
echo "  Infisical:  $INFISICAL_STATUS"

PG_STATUS=$(pct exec $CTID -- docker ps --filter name=infisical-postgres --format "{{.Names}}: {{.Status}}" 2>/dev/null || echo "UNKNOWN")
echo "  PostgreSQL: $PG_STATUS"

REDIS_STATUS=$(pct exec $CTID -- docker ps --filter name=infisical-redis --format "{{.Names}}: {{.Status}}" 2>/dev/null || echo "UNKNOWN")
echo "  Redis:      $REDIS_STATUS"

# ─────────────────────────────────────────────
# Step 6: Configure Proxmox firewall and lock down
# ─────────────────────────────────────────────
echo ""
echo "=== Step 6/6: Configuring firewall and locking down ==="

# Enable datacenter firewall if not already
if ! grep -q "enable: 1" /etc/pve/firewall/cluster.fw 2>/dev/null; then
    mkdir -p /etc/pve/firewall
    cat > /etc/pve/firewall/cluster.fw << 'FWFILE'
[OPTIONS]
enable: 1
policy_in: ACCEPT
policy_out: ACCEPT

[RULES]
FWFILE
    echo "  Datacenter firewall enabled"
fi

# Create firewall config — no outbound DB rule needed since PG is internal
cat > /etc/pve/firewall/${CTID}.fw << FWFILE
[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT
log_level_in: nolog
log_level_out: nolog

[RULES]
IN ACCEPT -source +dc/infisical-clients -p tcp -dport 8080 # Infisical API from internal clients
FWFILE

echo "  Firewall config written to /etc/pve/firewall/${CTID}.fw"
echo "  NOTE: You still need to create the 'infisical-clients' IP Set in the Proxmox UI"
echo "        Datacenter -> Firewall -> IPSet -> Create 'infisical-clients'"
echo "        Add the IPs of LXCs that should access Infisical."
echo ""
echo "  List your LXC IPs with:"
echo "    for ctid in \$(pct list | awk 'NR>1 {print \$1}'); do"
echo "      echo \"LXC \$ctid (\$(pct config \$ctid | grep hostname | awk '{print \$2}')): \$(pct config \$ctid | grep net0 | grep -oP 'ip=\K[^/]+')\""
echo "    done"

# Remove DNS
pct set $CTID --delete nameserver
echo ""
echo "  DNS removed — LXC can no longer resolve external hostnames"
echo "  Outbound traffic blocked by firewall policy_out: DROP"
echo "  No outbound exceptions needed — database is internal"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Infisical LXC $CTID is ready!"
echo "============================================"
echo ""
echo "  Hostname:     $HOSTNAME"
echo "  IP:           $LXC_IP"
echo "  URL:          http://${LXC_IP}:8080"
echo "  Cores:        $CORES"
echo "  Memory:       ${MEMORY}MB"
echo "  Disk:         ${DISK_SIZE}GB"
echo "  Database:     PostgreSQL 16 (sidecar, internal only)"
echo "  Redis:        redis:7-alpine (sidecar, internal only)"
echo "  Compose:      /opt/docker/docker-compose.yaml"
echo ""
echo "  Next steps:"
echo "    1. Create the 'infisical-clients' IP Set in Proxmox UI"
echo "       (Datacenter -> Firewall -> IPSet)"
echo "    2. Open http://${LXC_IP}:8080 and create your admin account"
echo "    3. Create a project and machine identities for your services"
echo ""
echo "  Backup the database:"
echo "    pct exec $CTID -- docker exec infisical-postgres pg_dump -U infisical infisical > infisical-backup.sql"
echo ""
echo "  Nuclear reset (wipe everything, start fresh):"
echo "    pct enter $CTID"
echo "    cd /opt/docker && docker compose down"
echo "    rm -rf /opt/pgdata/* /opt/redis-data/*"
echo "    docker compose up -d"
echo ""
echo "  Connect manually:"
echo "    pct enter $CTID"
echo "    cd /opt/docker && docker compose logs -f"
echo ""
echo "  To re-enable internet temporarily (for updates):"
echo "    pct set $CTID --nameserver 1.1.1.1"
echo "    sed -i 's/policy_out: DROP/policy_out: ACCEPT/' /etc/pve/firewall/${CTID}.fw"
echo "    # ... do updates ..."
echo "    sed -i 's/policy_out: ACCEPT/policy_out: DROP/' /etc/pve/firewall/${CTID}.fw"
echo "    pct set $CTID --delete nameserver"
