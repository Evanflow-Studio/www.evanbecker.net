#!/bin/bash
#
# setup-ci.sh
# Run this ON YOUR PROXMOX HOST to create and configure the CI LXC.
#
# Usage:
#   chmod +x setup-ci.sh
#   ./setup-ci.sh
#
# What it does:
#   1. Detects your network (subnet, gateway)
#   2. Creates LXC container with Docker support (nesting=1)
#   3. Installs Docker + Docker Compose inside it
#   4. Mounts ssd1 for registry storage (falls back to rootfs)
#   5. Starts Docker Registry (registry:2) and GitHub Actions Runner via Docker Compose
#   6. Configures Proxmox firewall (inbound 5000 from dc/registry-clients, outbound ACCEPT)
#   7. Keeps internet access (runner needs GitHub, registry serves images)
#
set -euo pipefail

# ─────────────────────────────────────────────
# Configuration — edit these to match your setup
# ─────────────────────────────────────────────
CTID=108
HOSTNAME="ci"
LXC_IP_OVERRIDE="168"  # IP last octet (doesn't match CTID)
CORES=2
MEMORY=2048
SWAP=512
DISK_SIZE=16             # GB, for the rootfs
REGISTRY_DISK_SIZE=32    # GB, for the ssd1 mount (registry data)
STORAGE="local-lvm"      # rootfs storage
SSD_STORAGE="ssd1"       # storage for registry data (set to "" to skip)
REPO_URL="https://github.com/Evanflow-Studio/www.evanbecker.net"

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
    echo "  SSD storage ($SSD_STORAGE): not found, will use rootfs for registry data"
fi

# ─────────────────────────────────────────────
# Prompt for passwords and tokens
# ─────────────────────────────────────────────
echo ""
echo "=== Password and token configuration ==="

read -sp "Root password for LXC container: " ROOT_PASSWORD
echo ""
echo ""
echo "  GitHub PAT is needed for runner registration."
echo "  Required scopes: 'repo' (for repo-level runner)"
echo "  Create at: https://github.com/settings/tokens"
echo ""
read -sp "GitHub PAT (for runner registration): " GITHUB_PAT
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
if [ "$SSD_AVAILABLE" = true ]; then
    echo "  Registry:   ${REGISTRY_DISK_SIZE}GB on $SSD_STORAGE (mounted at /opt/registry-data)"
else
    echo "  Registry:   /opt/registry-data on rootfs"
fi
echo "  Repo:       $REPO_URL"
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

# Mount ssd1 for registry data if available
if [ "$SSD_AVAILABLE" = true ]; then
    echo "  Mounting $SSD_STORAGE at /opt/registry-data..."
    pct set $CTID --mp0 ${SSD_STORAGE}:${REGISTRY_DISK_SIZE},mp=/opt/registry-data
fi

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
# Step 4: Prepare data directory and create Docker Compose config
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4/6: Creating Docker Compose configuration ==="

if [ "$SSD_AVAILABLE" = true ]; then
    pct exec $CTID -- bash -c "ls -la /opt/registry-data && echo 'ssd1 mount verified'"
    echo "  /opt/registry-data mounted from $SSD_STORAGE"
else
    pct exec $CTID -- bash -c "mkdir -p /opt/registry-data"
    echo "  /opt/registry-data created on rootfs"
fi

pct exec $CTID -- mkdir -p /opt/docker

# Write docker-compose.yaml
pct exec $CTID -- bash -c "cat > /opt/docker/docker-compose.yaml << 'COMPOSEFILE'
services:
  registry:
    image: registry:2
    container_name: registry
    restart: always
    ports:
      - \"LXC_IP_PLACEHOLDER:5000:5000\"
    volumes:
      - /opt/registry-data:/var/lib/registry
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: \"true\"

  runner:
    image: myoung34/github-runner:latest
    container_name: runner
    restart: always
    environment:
      REPO_URL: \${REPO_URL}
      ACCESS_TOKEN: \${GITHUB_PAT}
      RUNNER_NAME: homelab-runner
      RUNNER_WORKDIR: /tmp/runner/work
      RUNNER_GROUP: default
      RUNNER_SCOPE: repo
      EPHEMERAL: \"true\"
      LABELS: self-hosted,linux,homelab
      DISABLE_AUTO_UPDATE: \"true\"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
COMPOSEFILE"

# Inject the actual LXC IP into the compose file
pct exec $CTID -- bash -c "
    MY_IP=\$(ip addr show eth0 | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1)
    sed -i \"s/LXC_IP_PLACEHOLDER/\$MY_IP/\" /opt/docker/docker-compose.yaml
    echo \"Bound registry to: \$MY_IP:5000\"
"

# Write .env file
pct exec $CTID -- bash -c "cat > /opt/docker/.env << ENVFILE
# GitHub PAT for runner registration (needs 'repo' scope)
GITHUB_PAT=${GITHUB_PAT}

# Repository URL for the runner
REPO_URL=${REPO_URL}
ENVFILE"

pct exec $CTID -- chmod 600 /opt/docker/.env
echo "  Docker Compose config created at /opt/docker/docker-compose.yaml"
echo "  Environment file created at /opt/docker/.env"

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
IN ACCEPT -source +dc/registry-clients -p tcp -dport 5000 # Docker Registry from registry clients
FWFILE

echo "  Firewall config written to /etc/pve/firewall/${CTID}.fw"
echo "  Inbound: 5000 from dc/registry-clients only"
echo "  Outbound: all allowed (runner needs GitHub access)"
echo ""
echo "  NOTE: You still need to create the 'registry-clients' IP Set in the Proxmox UI"
echo "        Datacenter -> Firewall -> IPSet -> Create 'registry-clients'"
echo "        Add the IPs of LXCs that should pull images (e.g., LXC 109 website)."

# ─────────────────────────────────────────────
# Step 6: Start services and verify
# ─────────────────────────────────────────────
echo ""
echo "=== Step 6/6: Starting services and verifying ==="

pct exec $CTID -- bash -c "cd /opt/docker && docker compose up -d"

# Wait for registry to be ready
echo "  Waiting for services to start..."
sleep 5

pct exec $CTID -- bash -c "
    echo '  Docker:   '$(docker --version)
    echo '  Registry: '$(curl -s http://localhost:5000/v2/ >/dev/null 2>&1 && echo 'not reachable on localhost (expected — bound to LXC IP)' || echo 'checking...')
"

# Check registry via LXC IP
REGISTRY_CHECK=$(pct exec $CTID -- bash -c "curl -s http://${LXC_IP}:5000/v2/ 2>/dev/null" || echo "FAILED")
if [ "$REGISTRY_CHECK" = "{}" ]; then
    echo "  Registry:  responding on ${LXC_IP}:5000"
else
    echo "  Registry:  may not be ready yet (check logs: pct exec $CTID -- bash -c 'cd /opt/docker && docker compose logs registry')"
fi

RUNNER_STATUS=$(pct exec $CTID -- docker ps --filter name=runner --format '{{.Status}}' 2>/dev/null || echo "FAILED")
echo "  Runner:    $RUNNER_STATUS"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  CI LXC $CTID is ready!"
echo "============================================"
echo ""
echo "  Hostname:     $HOSTNAME"
echo "  IP:           $LXC_IP"
echo "  Cores:        $CORES"
echo "  Memory:       ${MEMORY}MB"
echo "  Registry:     ${LXC_IP}:5000"
echo "  Runner:       ephemeral, auto-restarts"
echo "  Compose:      /opt/docker/docker-compose.yaml"
echo "  Registry data: /opt/registry-data $([ "$SSD_AVAILABLE" = true ] && echo "(on $SSD_STORAGE)" || echo "(on rootfs)")"
echo ""
echo "  NEXT STEPS:"
echo "  ────────────"
echo ""
echo "  1. Create the 'registry-clients' IP Set in Proxmox UI:"
echo "     Datacenter -> Firewall -> IPSet -> Create 'registry-clients'"
echo "     Add: $LXC_IP (this LXC) and the website LXC IP"
echo ""
echo "  2. Configure client LXCs to trust the insecure registry:"
echo "     On each client LXC, add to /etc/docker/daemon.json:"
echo "       { \"insecure-registries\": [\"${LXC_IP}:5000\"] }"
echo "     Then: systemctl restart docker"
echo ""
echo "  3. Push an image to test:"
echo "     docker tag myimage:latest ${LXC_IP}:5000/myimage:latest"
echo "     docker push ${LXC_IP}:5000/myimage:latest"
echo ""
echo "  4. Verify runner registration:"
echo "     Check https://github.com/<org>/<repo>/settings/actions/runners"
echo "     Runner should appear as 'homelab-runner'"
echo ""
echo "  View logs:"
echo "    pct enter $CTID"
echo "    cd /opt/docker && docker compose logs -f"
echo ""
echo "  Connect to the LXC:"
echo "    pct enter $CTID"
echo ""
