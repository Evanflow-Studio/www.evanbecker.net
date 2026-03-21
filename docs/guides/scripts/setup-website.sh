#!/bin/bash
#
# setup-website.sh
# Run this ON YOUR PROXMOX HOST to create and configure the website LXC.
#
# Usage:
#   chmod +x setup-website.sh
#   ./setup-website.sh
#
# What it does:
#   1. Detects your network (subnet, gateway)
#   2. Creates LXC container with Docker support (nesting=1)
#   3. Installs Docker + Docker Compose inside it
#   4. Clones repo and copies docker-compose.production.yaml
#   5. Writes .env placeholder (fill via Infisical CLI)
#   6. Configures insecure registry (for local Docker Registry on LXC 108)
#   7. Configures Proxmox firewall (outbound allow, inbound restricted)
#   8. Keeps internet access (needed for docker pulls, cloudflared)
#
set -euo pipefail

# ─────────────────────────────────────────────
# Configuration — edit these to match your setup
# ─────────────────────────────────────────────
CTID=109
HOSTNAME="website"
LXC_IP_OVERRIDE="169"  # IP last octet (doesn't match CTID)
CORES=4
MEMORY=4096
SWAP=1024
DISK_SIZE=32           # GB, for the rootfs
STORAGE="local-lvm"    # rootfs storage
CPUUNITS=2048          # highest priority — website must always be responsive
REPO_URL="https://github.com/Evanflow-Studio/www.evanbecker.net.git"
APP_DIR="/opt/app"
DOCKER_DIR="/opt/docker"

# ─────────────────────────────────────────────
# Auto-detect network
# ─────────────────────────────────────────────
echo "=== Detecting network configuration ==="

BRIDGE="vmbr0"
HOST_IP=$(ip addr show $BRIDGE | grep "inet " | awk '{print $2}' | cut -d/ -f1)
SUBNET_PREFIX=$(echo "$HOST_IP" | cut -d. -f1-3)
GATEWAY=$(ip route | grep default | awk '{print $3}')
LXC_IP="${SUBNET_PREFIX}.${LXC_IP_OVERRIDE:-$CTID}"

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

# Auto-detect CI LXC 108 IP (for registry)
CI_CTID=108
CI_LXC_IP=""
if pct status $CI_CTID &>/dev/null; then
    CI_LXC_IP=$(pct config $CI_CTID | grep net0 | grep -oP 'ip=\K[^/]+')
    echo "  CI LXC IP:  $CI_LXC_IP (auto-detected from LXC $CI_CTID)"
else
    CI_LXC_IP="${SUBNET_PREFIX}.168"
    echo "  CI LXC IP:  $CI_LXC_IP (estimated — LXC $CI_CTID not found)"
fi
echo ""

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
# Prompt for passwords
# ─────────────────────────────────────────────
echo ""
echo "=== Password configuration ==="

read -sp "Root password for LXC container: " ROOT_PASSWORD
echo ""
echo ""
echo "  Cloudflare Tunnel token (from Zero Trust dashboard -> Networks -> Tunnels -> Create)."
echo "  Copy the token string after '--token' from the install command."
echo "  Leave blank to skip cloudflared setup (you can add it to .env later)."
echo ""
read -sp "Cloudflare Tunnel token (or Enter to skip): " TUNNEL_TOKEN
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
echo "  cpuunits:   $CPUUNITS"
echo "  Registry:   $CI_LXC_IP:5000"
echo "  Repo:       $REPO_URL"
if [ -n "$TUNNEL_TOKEN" ]; then
    echo "  Tunnel:     Cloudflared will be configured"
else
    echo "  Tunnel:     Skipped (add to .env later)"
fi
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

# Set cpuunits (highest priority for website)
pct set $CTID --cpuunits $CPUUNITS

echo "  LXC $CTID created (cpuunits: $CPUUNITS)"

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
    apt-get install -y -qq curl wget ca-certificates gnupg lsb-release sudo htop git >/dev/null 2>&1
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

# Configure insecure registry (for local Docker Registry on LXC 108)
pct exec $CTID -- bash -c "
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << DAEMONJSON
{
  \"insecure-registries\": [\"${CI_LXC_IP}:5000\"]
}
DAEMONJSON
    systemctl restart docker
"
echo "  Insecure registry configured: ${CI_LXC_IP}:5000"

# ─────────────────────────────────────────────
# Step 4: Clone repository and set up Docker Compose
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4/6: Cloning repository and setting up Docker Compose ==="

pct exec $CTID -- bash -c "git clone $REPO_URL $APP_DIR"
echo "  Repository cloned to $APP_DIR"

pct exec $CTID -- mkdir -p $DOCKER_DIR

# Copy production compose from repo
pct exec $CTID -- bash -c "cp $APP_DIR/docker-compose.production.yaml $DOCKER_DIR/docker-compose.yaml"

# Inject the actual LXC IP into the compose file
pct exec $CTID -- bash -c "
    MY_IP=\$(ip addr show eth0 | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1)
    sed -i \"s/\\\${LXC_IP}/\$MY_IP/g\" $DOCKER_DIR/docker-compose.yaml
    echo \"Bound to: \$MY_IP:80\"
"

# Write .env placeholder
# No app secrets here — the .NET API pulls them directly from Infisical at startup.
pct exec $CTID -- bash -c "cat > $DOCKER_DIR/.env << ENVFILE
# Registry (LXC 108)
REGISTRY=${CI_LXC_IP}:5000

# Infisical (LXC 107) — the API connects here at startup to pull all its secrets
INFISICAL_CLIENT_ID=CHANGE_ME
INFISICAL_CLIENT_SECRET=CHANGE_ME
INFISICAL_ADDRESS=http://${SUBNET_PREFIX}.107:8080
INFISICAL_PROJECT_ID=CHANGE_ME

# Cloudflare Tunnel
TUNNEL_TOKEN=${TUNNEL_TOKEN:-CHANGE_ME}
ENVFILE"

pct exec $CTID -- chmod 600 $DOCKER_DIR/.env
echo "  Docker Compose set up at $DOCKER_DIR/docker-compose.yaml"
echo "  Environment file created at $DOCKER_DIR/.env (fill in CHANGE_ME values via Infisical)"

# ─────────────────────────────────────────────
# Step 5: Configure Proxmox firewall
# ─────────────────────────────────────────────
echo ""
echo "=== Step 5/6: Configuring Proxmox firewall ==="

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
IN ACCEPT -p tcp -dport 80 # HTTP
IN ACCEPT -p tcp -dport 443 # HTTPS
FWFILE

echo "  Firewall config written to /etc/pve/firewall/${CTID}.fw"
echo "  Inbound: 80/443 from LAN only"
echo "  Outbound: all allowed (cloudflared, docker pulls)"

# ─────────────────────────────────────────────
# Step 6: Verify setup
# ─────────────────────────────────────────────
echo ""
echo "=== Step 6/6: Verifying setup ==="

pct exec $CTID -- bash -c "
    echo '  Docker:  '\$(docker --version)
    echo '  Git:     '\$(git --version)
    echo '  Repo:    '\$(ls $APP_DIR/docker-compose.production.yaml 2>/dev/null && echo 'cloned OK' || echo 'MISSING')
    echo '  Compose: '\$(ls $DOCKER_DIR/docker-compose.yaml 2>/dev/null && echo 'OK' || echo 'MISSING')
"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Website LXC $CTID is ready!"
echo "============================================"
echo ""
echo "  Hostname:     $HOSTNAME"
echo "  IP:           $LXC_IP"
echo "  Cores:        $CORES"
echo "  Memory:       ${MEMORY}MB"
echo "  cpuunits:     $CPUUNITS"
echo "  Compose:      $DOCKER_DIR/docker-compose.yaml"
echo "  Repo:         $APP_DIR"
echo "  Registry:     ${CI_LXC_IP}:5000"
echo ""
echo "  NEXT STEPS:"
echo "  ────────────"
echo ""
echo "  1. Populate secrets in $DOCKER_DIR/.env"
echo "     (Use Infisical CLI or manually fill CHANGE_ME values)"
echo ""
echo "  2. Add LXC $CTID ($LXC_IP) to these IP Sets in Proxmox UI:"
echo "     Datacenter -> Firewall -> IPSet"
echo "     - db-prod-clients"
echo "     - db-test-clients"
echo "     - infisical-clients"
echo "     - registry-clients"
echo ""
echo "  3. Start the stack:"
echo "     pct enter $CTID"
echo "     cd $DOCKER_DIR && docker compose up -d"
echo ""
echo "  4. Configure public hostnames in Cloudflare Zero Trust dashboard:"
echo "     Networks -> Tunnels -> your tunnel -> Public Hostname"
echo "     All routes point to http://traefik:80 (Traefik routes by hostname):"
echo "       www.evanbecker.net      -> http://traefik:80"
echo "       evanbecker.net          -> http://traefik:80"
echo "       api.evanbecker.net      -> http://traefik:80"
echo "       test.evanbecker.net     -> http://traefik:80"
echo "       api-test.evanbecker.net -> http://traefik:80"
echo ""
echo "  Once running, the site will be available at:"
echo "    http://$LXC_IP (direct, for LAN testing)"
if [ -n "$TUNNEL_TOKEN" ]; then
    echo "    https://www.evanbecker.net (via Cloudflare Tunnel)"
    echo "    https://api.evanbecker.net (via Cloudflare Tunnel)"
fi
echo ""
echo "  Connect to the LXC:"
echo "    pct enter $CTID"
echo ""
