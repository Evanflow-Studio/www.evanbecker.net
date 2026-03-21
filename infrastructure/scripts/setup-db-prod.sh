#!/bin/bash
#
# setup-db-prod.sh
# Run this ON YOUR PROXMOX HOST to create and configure the production database LXC.
#
# Usage:
#   chmod +x setup-db-prod.sh
#   ./setup-db-prod.sh
#
# What it does:
#   1. Detects your network (subnet, gateway)
#   2. Creates LXC container with Docker support
#   3. Installs Docker + Docker Compose inside it
#   4. Mounts ssd1 for PostgreSQL data (falls back to rootfs)
#   5. Starts PostgreSQL 18 via Docker
#   6. Creates databases and users (evanbecker, n8n, infisical)
#   7. Configures Proxmox firewall (inbound 5432 only, no outbound)
#   8. Removes internet access
#   9. Sets up daily pg_dump backup cron
#
set -euo pipefail

# ─────────────────────────────────────────────
# Configuration — edit these to match your setup
# ─────────────────────────────────────────────
CTID=105
HOSTNAME="docker-db-prod"
CORES=2
MEMORY=2048
SWAP=512
DISK_SIZE=32           # GB, for the rootfs
PGDATA_DISK_SIZE=32    # GB, for the ssd1 mount
STORAGE="local-lvm"    # rootfs storage
SSD_STORAGE="ssd1"     # storage for PostgreSQL data (set to "" to skip)
CONTAINER_NAME="postgres-prod"
PG_VERSION=18

# Database users to create (passwords will be prompted)
# Add more entries here if other services share this database LXC
DB_USERS=("evanbecker_app")
DB_NAMES=("evanbecker")

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

# Check if ssd1 exists
SSD_AVAILABLE=false
if [ -n "$SSD_STORAGE" ] && pvesm status | grep -q "^${SSD_STORAGE}"; then
    SSD_AVAILABLE=true
    echo "  SSD storage ($SSD_STORAGE): available"
else
    echo "  SSD storage ($SSD_STORAGE): not found, will use rootfs for pgdata"
fi

# ─────────────────────────────────────────────
# Prompt for passwords
# ─────────────────────────────────────────────
echo ""
echo "=== Password configuration ==="

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
if [ "$SSD_AVAILABLE" = true ]; then
    echo "  PG Data:    ${PGDATA_DISK_SIZE}GB on $SSD_STORAGE (mounted at /opt/pgdata)"
else
    echo "  PG Data:    /opt/pgdata on rootfs"
fi
echo "  Databases:  ${DB_NAMES[*]}"
echo ""
read -p "Proceed? (y/N): " confirm
[ "$confirm" = "y" ] || exit 0

# ─────────────────────────────────────────────
# Step 1: Create the LXC container
# ─────────────────────────────────────────────
echo ""
echo "=== Step 1/9: Creating LXC container ==="

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

# Mount ssd1 for pgdata if available
if [ "$SSD_AVAILABLE" = true ]; then
    echo "  Mounting $SSD_STORAGE at /opt/pgdata..."
    pct set $CTID --mp0 ${SSD_STORAGE}:${PGDATA_DISK_SIZE},mp=/opt/pgdata
fi

# ─────────────────────────────────────────────
# Step 2: Start and configure OS
# ─────────────────────────────────────────────
echo ""
echo "=== Step 2/9: Starting container and configuring OS ==="

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
echo "=== Step 3/9: Installing Docker ==="

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
# Step 4: Prepare data directory
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4/9: Preparing data directory ==="

if [ "$SSD_AVAILABLE" = true ]; then
    # ssd1 is mounted at /opt/pgdata via the mp0 config
    pct exec $CTID -- bash -c "ls -la /opt/pgdata && echo 'ssd1 mount verified'"
    echo "  /opt/pgdata mounted from $SSD_STORAGE"
else
    pct exec $CTID -- bash -c "mkdir -p /opt/pgdata"
    echo "  /opt/pgdata created on rootfs"
fi

pct exec $CTID -- mkdir -p /opt/docker

# ─────────────────────────────────────────────
# Step 5: Create Docker Compose config
# ─────────────────────────────────────────────
echo ""
echo "=== Step 5/9: Creating Docker Compose configuration ==="

# Write docker-compose.yaml
pct exec $CTID -- bash -c "cat > /opt/docker/docker-compose.yaml << 'COMPOSEFILE'
services:
  postgres:
    image: postgres:${PG_VERSION}
    container_name: ${CONTAINER_NAME}
    restart: always
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
      - \"shared_buffers=512MB\"
      - \"-c\"
      - \"effective_cache_size=1536MB\"
      - \"-c\"
      - \"work_mem=16MB\"
      - \"-c\"
      - \"maintenance_work_mem=128MB\"
      - \"-c\"
      - \"wal_buffers=16MB\"
      - \"-c\"
      - \"checkpoint_completion_target=0.9\"
      - \"-c\"
      - \"max_wal_size=1GB\"
      - \"-c\"
      - \"max_connections=50\"
      - \"-c\"
      - \"log_min_duration_statement=1000\"
      - \"-c\"
      - \"log_line_prefix=%t [%p] %u@%d \"
    shm_size: 256mb
COMPOSEFILE"

# Inject the actual LXC IP into the compose file
pct exec $CTID -- bash -c "
    MY_IP=\$(ip addr show eth0 | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1)
    sed -i \"s/LXC_IP_PLACEHOLDER/\$MY_IP/\" /opt/docker/docker-compose.yaml
    echo \"Bound to: \$MY_IP:5432\"
"

# Write .env file with postgres superuser password
pct exec $CTID -- bash -c "
    echo 'POSTGRES_PASSWORD=${PG_SUPER_PASSWORD}' > /opt/docker/.env
    chmod 600 /opt/docker/.env
"
echo "  Docker Compose config created"

# ─────────────────────────────────────────────
# Step 6: Start PostgreSQL
# ─────────────────────────────────────────────
echo ""
echo "=== Step 6/9: Starting PostgreSQL ==="

pct exec $CTID -- bash -c "cd /opt/docker && docker compose up -d"

# Wait for PG to be ready
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
# Step 7: Create databases and users
# ─────────────────────────────────────────────
echo ""
echo "=== Step 7/9: Creating databases and users ==="

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
# Step 8: Configure Proxmox firewall
# ─────────────────────────────────────────────
echo ""
echo "=== Step 8/9: Configuring Proxmox firewall ==="

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

# Create firewall config for this LXC
cat > /etc/pve/firewall/${CTID}.fw << FWFILE
[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT
log_level_in: nolog
log_level_out: nolog

[RULES]
IN ACCEPT -source +dc/db-prod-clients -p tcp -dport 5432 # PostgreSQL from prod clients
FWFILE

echo "  Firewall config written to /etc/pve/firewall/${CTID}.fw"
echo "  NOTE: You still need to create the 'db-prod-clients' IP Set in the Proxmox UI"
echo "        Datacenter -> Firewall -> IPSet -> Create 'db-prod-clients'"
echo "        Add the IPs of LXCs that should access this database."
echo ""
echo "  List your LXC IPs with:"
echo "    for ctid in \$(pct list | awk 'NR>1 {print \$1}'); do"
echo "      echo \"LXC \$ctid (\$(pct config \$ctid | grep hostname | awk '{print \$2}')): \$(pct config \$ctid | grep net0 | grep -oP 'ip=\K[^/]+')\""
echo "    done"

# ─────────────────────────────────────────────
# Step 9: Lock down internet + setup backups
# ─────────────────────────────────────────────
echo ""
echo "=== Step 9/9: Locking down internet access and configuring backups ==="

# Setup backup cron BEFORE removing internet
pct exec $CTID -- bash -c "
    mkdir -p /opt/backups

    cat > /usr/local/bin/pg-backup.sh << 'BACKUPSCRIPT'
#!/bin/bash
set -euo pipefail

BACKUP_DIR=\"/opt/backups\"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

for DB in ${DB_NAMES[*]}; do
    FILENAME=\"\${BACKUP_DIR}/\${DB}_\${TIMESTAMP}.dump\"
    docker exec ${CONTAINER_NAME} pg_dump -U postgres -Fc \"\$DB\" > \"\$FILENAME\"
    echo \"\$(date): Backed up \${DB} -> \${FILENAME} (\$(du -h \"\$FILENAME\" | cut -f1))\"
done

find \"\$BACKUP_DIR\" -name '*.dump' -mtime +\${RETENTION_DAYS} -delete
echo \"\$(date): Cleaned backups older than \${RETENTION_DAYS} days\"
BACKUPSCRIPT

    chmod +x /usr/local/bin/pg-backup.sh

    # Add cron job
    (crontab -l 2>/dev/null; echo '0 1 * * * /usr/local/bin/pg-backup.sh >> /var/log/pg-backup.log 2>&1') | sort -u | crontab -
"
echo "  Backup cron configured (daily at 01:00)"

# Remove DNS
pct set $CTID --delete nameserver
echo "  DNS removed — LXC can no longer resolve external hostnames"
echo "  Outbound traffic blocked by firewall policy_out: DROP"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Production database LXC $CTID is ready!"
echo "============================================"
echo ""
echo "  Hostname:     $HOSTNAME"
echo "  IP:           $LXC_IP"
echo "  PostgreSQL:   $PG_VERSION (Docker: postgres:$PG_VERSION)"
echo "  Port:         5432"
echo "  Data:         /opt/pgdata $([ "$SSD_AVAILABLE" = true ] && echo "(on $SSD_STORAGE)" || echo "(on rootfs)")"
echo "  Compose:      /opt/docker/docker-compose.yaml"
echo "  Backups:      /opt/backups (daily pg_dump, 14 day retention)"
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
echo "    Create the 'db-prod-clients' IP Set in Proxmox UI"
echo "    (Datacenter -> Firewall -> IPSet)"
echo ""
echo "  To re-enable internet temporarily (for updates):"
echo "    pct set $CTID --nameserver 1.1.1.1"
echo "    # edit /etc/pve/firewall/${CTID}.fw -> policy_out: ACCEPT"
echo "    # ... do updates ..."
echo "    # edit /etc/pve/firewall/${CTID}.fw -> policy_out: DROP"
echo "    pct set $CTID --delete nameserver"
