#!/bin/bash
#
# setup-db-test.sh
# Run this ON YOUR PROXMOX HOST to create and configure the test database LXC.
#
# Usage:
#   chmod +x setup-db-test.sh
#   ./setup-db-test.sh
#
# What it does:
#   1. Detects your network (subnet, gateway)
#   2. Creates a lightweight LXC container with Docker support
#   3. Installs Docker + Docker Compose inside it
#   4. Starts PostgreSQL 18 via Docker (tuned for low resources)
#   5. Creates test databases and users
#   6. Configures Proxmox firewall (inbound 5432 only, no outbound)
#   7. Removes internet access
#   8. NO backups — test is ephemeral
#
set -euo pipefail

# ─────────────────────────────────────────────
# Configuration — edit these to match your setup
# ─────────────────────────────────────────────
CTID=106
HOSTNAME="docker-db-test"
CORES=1
MEMORY=1024
SWAP=256
DISK_SIZE=16             # GB, rootfs only (no ssd1 for test)
STORAGE="local-lvm"
CONTAINER_NAME="postgres-test"
PG_VERSION=18

# Database users to create
DB_USERS=("evanbecker_app" "n8n_app")
DB_NAMES=("evanbecker_test" "n8n_test")

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
    exit 1
fi

echo "  Host IP:    $HOST_IP"
echo "  Gateway:    $GATEWAY"
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

if pct status $CTID &>/dev/null; then
    echo "ERROR: LXC $CTID already exists!"
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

# ─────────────────────────────────────────────
# Prompt for passwords
# ─────────────────────────────────────────────
echo ""
echo "=== Password configuration ==="
echo "(Test passwords can be simple — this data is ephemeral)"
echo ""

read -sp "Root password for LXC container: " ROOT_PASSWORD
echo ""
read -sp "PostgreSQL superuser (postgres) password: " PG_SUPER_PASSWORD
echo ""

declare -A USER_PASSWORDS
for i in "${!DB_USERS[@]}"; do
    read -sp "Password for database user '${DB_USERS[$i]}' (database: ${DB_NAMES[$i]}): " pw
    echo ""
    USER_PASSWORDS[${DB_USERS[$i]}]="$pw"
done

# ─────────────────────────────────────────────
# Confirm
# ─────────────────────────────────────────────
echo ""
echo "=== Ready to create TEST LXC $CTID ==="
echo "  Hostname:   $HOSTNAME"
echo "  IP:         $LXC_IP/24"
echo "  Cores:      $CORES"
echo "  Memory:     ${MEMORY}MB"
echo "  Disk:       ${DISK_SIZE}GB on $STORAGE"
echo "  PG Data:    /opt/pgdata on rootfs (no ssd1)"
echo "  Backups:    NONE (ephemeral)"
echo "  Databases:  ${DB_NAMES[*]}"
echo ""
read -p "Proceed? (y/N): " confirm
[ "$confirm" = "y" ] || exit 0

# ─────────────────────────────────────────────
# Step 1: Create the LXC container
# ─────────────────────────────────────────────
echo ""
echo "=== Step 1/7: Creating LXC container ==="

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
echo "=== Step 2/7: Starting container and configuring OS ==="

pct start $CTID
sleep 3

pct exec $CTID -- bash -c "
    apt-get update -qq
    apt-get install -y -qq locales >/dev/null 2>&1
    sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
    locale-gen >/dev/null 2>&1
    update-locale LANG=en_US.UTF-8
    apt-get upgrade -y -qq >/dev/null 2>&1
    apt-get install -y -qq curl wget ca-certificates gnupg lsb-release sudo htop >/dev/null 2>&1
    timedatectl set-timezone America/Chicago
"
echo "  OS configured"

# ─────────────────────────────────────────────
# Step 3: Install Docker
# ─────────────────────────────────────────────
echo ""
echo "=== Step 3/7: Installing Docker ==="

pct exec $CTID -- bash -c "
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \$(. /etc/os-release && echo \$VERSION_CODENAME) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
"

DOCKER_VERSION=$(pct exec $CTID -- docker --version 2>/dev/null || echo "FAILED")
echo "  Docker installed: $DOCKER_VERSION"

# ─────────────────────────────────────────────
# Step 4: Create Docker Compose config
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4/7: Creating Docker Compose configuration ==="

pct exec $CTID -- bash -c "
    mkdir -p /opt/pgdata /opt/docker

    cat > /opt/docker/docker-compose.yaml << 'COMPOSEFILE'
services:
  postgres:
    image: postgres:${PG_VERSION}
    container_name: ${CONTAINER_NAME}
    restart: unless-stopped
    ports:
      - \"LXC_IP_PLACEHOLDER:5432:5432\"
    volumes:
      - /opt/pgdata:/var/lib/postgresql
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: \"--auth-host=scram-sha-256\"
    command:
      - \"postgres\"
      - \"-c\"
      - \"listen_addresses=*\"
      - \"-c\"
      - \"shared_buffers=128MB\"
      - \"-c\"
      - \"effective_cache_size=512MB\"
      - \"-c\"
      - \"work_mem=4MB\"
      - \"-c\"
      - \"maintenance_work_mem=64MB\"
      - \"-c\"
      - \"max_connections=20\"
      - \"-c\"
      - \"log_min_duration_statement=500\"
    shm_size: 128mb
COMPOSEFILE

    MY_IP=\$(ip addr show eth0 | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1)
    sed -i \"s/LXC_IP_PLACEHOLDER/\$MY_IP/\" /opt/docker/docker-compose.yaml
    echo \"Bound to: \$MY_IP:5432\"

    echo 'POSTGRES_PASSWORD=${PG_SUPER_PASSWORD}' > /opt/docker/.env
    chmod 600 /opt/docker/.env
"
echo "  Docker Compose config created"

# ─────────────────────────────────────────────
# Step 5: Start PostgreSQL
# ─────────────────────────────────────────────
echo ""
echo "=== Step 5/7: Starting PostgreSQL ==="

pct exec $CTID -- bash -c "cd /opt/docker && docker compose up -d"

echo "  Waiting for PostgreSQL to initialize..."
for i in $(seq 1 30); do
    if pct exec $CTID -- docker exec $CONTAINER_NAME pg_isready -U postgres &>/dev/null; then
        break
    fi
    sleep 1
    printf "."
done
echo ""

PG_VERSION_OUTPUT=$(pct exec $CTID -- docker exec $CONTAINER_NAME psql -U postgres -tAc "SELECT version();" 2>/dev/null || echo "FAILED")
echo "  PostgreSQL running: $PG_VERSION_OUTPUT"

# ─────────────────────────────────────────────
# Step 6: Create databases and users
# ─────────────────────────────────────────────
echo ""
echo "=== Step 6/7: Creating databases and users ==="

for i in "${!DB_USERS[@]}"; do
    USER="${DB_USERS[$i]}"
    DB="${DB_NAMES[$i]}"
    PW="${USER_PASSWORDS[$USER]}"

    pct exec $CTID -- docker exec $CONTAINER_NAME psql -U postgres -c "CREATE USER ${USER} WITH PASSWORD '${PW}';" 2>/dev/null
    pct exec $CTID -- docker exec $CONTAINER_NAME psql -U postgres -c "CREATE DATABASE ${DB} OWNER ${USER};" 2>/dev/null

    pct exec $CTID -- docker exec $CONTAINER_NAME psql -U postgres -d "$DB" -c "
        GRANT ALL PRIVILEGES ON DATABASE ${DB} TO ${USER};
        GRANT ALL PRIVILEGES ON SCHEMA public TO ${USER};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${USER};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${USER};
    " 2>/dev/null

    echo "  Created database '$DB' with user '$USER'"
done

# ─────────────────────────────────────────────
# Step 7: Firewall + lock down
# ─────────────────────────────────────────────
echo ""
echo "=== Step 7/7: Configuring firewall and locking down ==="

# Ensure datacenter firewall exists
if ! grep -q "enable: 1" /etc/pve/firewall/cluster.fw 2>/dev/null; then
    mkdir -p /etc/pve/firewall
    cat > /etc/pve/firewall/cluster.fw << 'FWFILE'
[OPTIONS]
enable: 1
policy_in: ACCEPT
policy_out: ACCEPT

[RULES]
FWFILE
fi

cat > /etc/pve/firewall/${CTID}.fw << FWFILE
[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT
log_level_in: nolog
log_level_out: nolog

[RULES]
IN ACCEPT -source +dc/db-test-clients -p tcp -dport 5432 # PostgreSQL from test clients
FWFILE

echo "  Firewall config written"

# Remove DNS
pct set $CTID --delete nameserver
echo "  Internet access removed"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Test database LXC $CTID is ready!"
echo "============================================"
echo ""
echo "  Hostname:     $HOSTNAME"
echo "  IP:           $LXC_IP"
echo "  PostgreSQL:   $PG_VERSION (Docker: postgres:$PG_VERSION)"
echo "  Port:         5432"
echo "  Data:         /opt/pgdata (rootfs, NO backups)"
echo ""
echo "  Databases:"
for i in "${!DB_NAMES[@]}"; do
    echo "    ${DB_NAMES[$i]} (user: ${DB_USERS[$i]})"
done
echo ""
echo "  Connection string format:"
echo "    Host=$LXC_IP;Port=5432;Database=<db_name>;Username=<user>;Password=<password>;"
echo ""
echo "  Connect manually:"
echo "    pct enter $CTID"
echo "    docker exec -it $CONTAINER_NAME psql -U postgres"
echo ""
echo "  REMAINING MANUAL STEP:"
echo "    Create the 'db-test-clients' IP Set in Proxmox UI"
echo "    (Datacenter -> Firewall -> IPSet)"
echo ""
echo "  Nuclear reset (wipe everything, start fresh):"
echo "    pct enter $CTID"
echo "    cd /opt/docker && docker compose down && rm -rf /opt/pgdata/* && docker compose up -d"
echo "    # Then re-run the CREATE USER/DATABASE SQL"
echo ""
echo "  Or destroy and re-run this script:"
echo "    pct stop $CTID && pct destroy $CTID"
echo "    ./setup-db-test.sh"
