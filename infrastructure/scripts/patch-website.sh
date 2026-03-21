#!/bin/bash
#
# patch-website.sh
# Run this ON YOUR PROXMOX HOST after setup-website.sh has completed.
# Pulls secrets from Infisical, rewrites docker-compose for prod+test,
# builds the stack, and runs EF Core migrations.
#
# Usage:
#   chmod +x patch-website.sh
#   ./patch-website.sh
#
# Prerequisites:
#   - LXC 109 created via setup-website.sh
#   - Infisical running on LXC 107 with secrets populated
#   - Machine Identity created in Infisical (Client ID + Secret)
#   - LXC 109 IP added to db-prod-clients and db-test-clients IP Sets
#
set -euo pipefail

CTID=109
DOCKER_DIR="/opt/docker"
APP_DIR="/opt/app"

# ─────────────────────────────────────────────
# Prompt for Infisical credentials
# ─────────────────────────────────────────────
echo "=== Infisical Configuration ==="
echo ""
read -p "Infisical address (e.g., https://secrets.evanbecker.net or http://192.168.0.107:8080): " INFISICAL_ADDRESS
read -p "Infisical Machine Identity Client ID: " INFISICAL_CLIENT_ID
read -sp "Infisical Machine Identity Client Secret: " INFISICAL_CLIENT_SECRET
echo ""
read -p "Infisical Project ID (from Project Settings -> General): " INFISICAL_PROJECT_ID
echo ""

# ─────────────────────────────────────────────
# Step 1: Install Infisical CLI
# ─────────────────────────────────────────────
echo "=== Step 1/6: Installing Infisical CLI ==="

pct exec $CTID -- bash << 'REMOTE'
curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash >/dev/null 2>&1
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq infisical >/dev/null 2>&1
REMOTE

INFISICAL_VERSION=$(pct exec $CTID -- infisical --version 2>/dev/null || echo "FAILED")
echo "  Infisical CLI installed: $INFISICAL_VERSION"

# ─────────────────────────────────────────────
# Step 2: Pull secrets from Infisical
# ─────────────────────────────────────────────
echo ""
echo "=== Step 2/6: Pulling secrets from Infisical ==="

# Authenticate and export secrets for prod
echo "  Pulling prod secrets..."
PROD_SECRETS=$(pct exec $CTID -- bash -c "
    TOKEN=\$(infisical login --method=universal-auth \
        --client-id='$INFISICAL_CLIENT_ID' \
        --client-secret='$INFISICAL_CLIENT_SECRET' \
        --domain='$INFISICAL_ADDRESS/api' \
        --plain 2>/dev/null)
    infisical export \
        --token=\$TOKEN \
        --projectId='$INFISICAL_PROJECT_ID' \
        --env=prod \
        --domain='$INFISICAL_ADDRESS/api' \
        --format=dotenv 2>/dev/null
")

if [ -z "$PROD_SECRETS" ]; then
    echo "  ERROR: Failed to pull prod secrets from Infisical"
    echo "  Check your Client ID, Client Secret, and Project ID"
    exit 1
fi
echo "  Prod secrets retrieved"

# Pull test secrets
echo "  Pulling test secrets..."
TEST_SECRETS=$(pct exec $CTID -- bash -c "
    TOKEN=\$(infisical login --method=universal-auth \
        --client-id='$INFISICAL_CLIENT_ID' \
        --client-secret='$INFISICAL_CLIENT_SECRET' \
        --domain='$INFISICAL_ADDRESS/api' \
        --plain 2>/dev/null)
    infisical export \
        --token=\$TOKEN \
        --projectId='$INFISICAL_PROJECT_ID' \
        --env=test \
        --domain='$INFISICAL_ADDRESS/api' \
        --format=dotenv 2>/dev/null
")

if [ -z "$TEST_SECRETS" ]; then
    echo "  ERROR: Failed to pull test secrets from Infisical"
    exit 1
fi
echo "  Test secrets retrieved"

# ─────────────────────────────────────────────
# Step 3: Write docker-compose with prod + test
# ─────────────────────────────────────────────
echo ""
echo "=== Step 3/6: Writing Docker Compose config (prod + test) ==="

# Get LXC IP for port binding
LXC_IP=$(pct config $CTID | grep net0 | grep -oP 'ip=\K[^/]+')

pct exec $CTID -- bash -c 'cat > '"$DOCKER_DIR"'/docker-compose.yaml << '"'"'COMPOSEFILE'"'"'
services:
  traefik:
    image: traefik:v3.3
    container_name: traefik
    restart: always
    ports:
      - "LXC_IP_PLACEHOLDER:80:80"
      - "LXC_IP_PLACEHOLDER:443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"

  # ── Production ──

  api-prod:
    build:
      context: /opt/app
      dockerfile: evanbecker-api/Dockerfile
    container_name: evanbecker-api-prod
    restart: always
    env_file:
      - .env.prod
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:80
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api-prod.rule=Host(`api.evanbecker.net`)"
      - "traefik.http.routers.api-prod.entrypoints=web"
      - "traefik.http.services.api-prod.loadbalancer.server.port=80"

  client-prod:
    build:
      context: /opt/app
      dockerfile: evanbecker-client/Dockerfile
    container_name: evanbecker-client-prod
    restart: always
    env_file:
      - .env.prod.client
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.client-prod.rule=Host(`www.evanbecker.net`) || Host(`evanbecker.net`)"
      - "traefik.http.routers.client-prod.entrypoints=web"
      - "traefik.http.services.client-prod.loadbalancer.server.port=3000"

  # ── Test ──

  api-test:
    build:
      context: /opt/app
      dockerfile: evanbecker-api/Dockerfile
    container_name: evanbecker-api-test
    restart: always
    env_file:
      - .env.test
    environment:
      - ASPNETCORE_ENVIRONMENT=Staging
      - ASPNETCORE_URLS=http://+:80
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api-test.rule=Host(`api-test.evanbecker.net`)"
      - "traefik.http.routers.api-test.entrypoints=web"
      - "traefik.http.services.api-test.loadbalancer.server.port=80"

  client-test:
    build:
      context: /opt/app
      dockerfile: evanbecker-client/Dockerfile
    container_name: evanbecker-client-test
    restart: always
    env_file:
      - .env.test.client
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.client-test.rule=Host(`test.evanbecker.net`)"
      - "traefik.http.routers.client-test.entrypoints=web"
      - "traefik.http.services.client-test.loadbalancer.server.port=3000"

  # ── Tunnel ──

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: always
    env_file:
      - .env.tunnel
    command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
    depends_on:
      - traefik
COMPOSEFILE'

# Inject LXC IP
pct exec $CTID -- sed -i "s/LXC_IP_PLACEHOLDER/$LXC_IP/g" $DOCKER_DIR/docker-compose.yaml
echo "  Docker Compose written (bound to $LXC_IP)"

# ─────────────────────────────────────────────
# Step 4: Write env files from Infisical secrets
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4/6: Writing environment files from Infisical ==="

# Helper: extract a value from dotenv string
get_secret() {
    local secrets="$1"
    local key="$2"
    echo "$secrets" | grep "^${key}=" | sed "s/^${key}=//" | tr -d '"'
}

# Extract prod values
PROD_DB_HOST=$(get_secret "$PROD_SECRETS" "DB_HOST")
PROD_DB_PORT=$(get_secret "$PROD_SECRETS" "DB_PORT")
PROD_DB_NAME=$(get_secret "$PROD_SECRETS" "DB_NAME")
PROD_DB_USER=$(get_secret "$PROD_SECRETS" "DB_USER")
PROD_DB_PASSWORD=$(get_secret "$PROD_SECRETS" "DB_PASSWORD")
PROD_AUTH0_DOMAIN=$(get_secret "$PROD_SECRETS" "AUTH0_DOMAIN")
PROD_AUTH0_AUDIENCE=$(get_secret "$PROD_SECRETS" "AUTH0_AUDIENCE")
PROD_AUTH0_CLIENT_ID=$(get_secret "$PROD_SECRETS" "AUTH0_CLIENT_ID")
PROD_AUTH0_CLIENT_SECRET=$(get_secret "$PROD_SECRETS" "AUTH0_CLIENT_SECRET")
PROD_AUTH0_REDIRECT_URI=$(get_secret "$PROD_SECRETS" "AUTH0_REDIRECT_URI")
PROD_SITE_URL=$(get_secret "$PROD_SECRETS" "SITE_URL")
PROD_API_URL=$(get_secret "$PROD_SECRETS" "API_URL")

# Extract test values
TEST_DB_HOST=$(get_secret "$TEST_SECRETS" "DB_HOST")
TEST_DB_PORT=$(get_secret "$TEST_SECRETS" "DB_PORT")
TEST_DB_NAME=$(get_secret "$TEST_SECRETS" "DB_NAME")
TEST_DB_USER=$(get_secret "$TEST_SECRETS" "DB_USER")
TEST_DB_PASSWORD=$(get_secret "$TEST_SECRETS" "DB_PASSWORD")
TEST_AUTH0_DOMAIN=$(get_secret "$TEST_SECRETS" "AUTH0_DOMAIN")
TEST_AUTH0_AUDIENCE=$(get_secret "$TEST_SECRETS" "AUTH0_AUDIENCE")
TEST_AUTH0_CLIENT_ID=$(get_secret "$TEST_SECRETS" "AUTH0_CLIENT_ID")
TEST_AUTH0_CLIENT_SECRET=$(get_secret "$TEST_SECRETS" "AUTH0_CLIENT_SECRET")
TEST_AUTH0_REDIRECT_URI=$(get_secret "$TEST_SECRETS" "AUTH0_REDIRECT_URI")
TEST_SITE_URL=$(get_secret "$TEST_SECRETS" "SITE_URL")
TEST_API_URL=$(get_secret "$TEST_SECRETS" "API_URL")

# Prod API env
pct exec $CTID -- bash -c "cat > $DOCKER_DIR/.env.prod << EOF
ConnectionStrings__Database=Host=${PROD_DB_HOST};Port=${PROD_DB_PORT};Database=${PROD_DB_NAME};Username=${PROD_DB_USER};Password=${PROD_DB_PASSWORD};
Auth0__Domain=${PROD_AUTH0_DOMAIN}
Auth0__Audience=${PROD_AUTH0_AUDIENCE}
Auth0__ClientId=${PROD_AUTH0_CLIENT_ID}
Auth0__ClientSecret=${PROD_AUTH0_CLIENT_SECRET}
EOF"

# Prod client env
pct exec $CTID -- bash -c "cat > $DOCKER_DIR/.env.prod.client << EOF
NEXT_PUBLIC_SITE_URL=${PROD_SITE_URL}
NEXT_PUBLIC_API_URL=${PROD_API_URL}
NEXT_PUBLIC_AUTH0_DOMAIN=${PROD_AUTH0_DOMAIN}
NEXT_PUBLIC_AUTH0_CLIENT_ID=${PROD_AUTH0_CLIENT_ID}
NEXT_PUBLIC_AUTH0_AUDIENCE=${PROD_AUTH0_AUDIENCE}
NEXT_PUBLIC_AUTH0_REDIRECT_URI=${PROD_AUTH0_REDIRECT_URI}
EOF"

# Test API env
pct exec $CTID -- bash -c "cat > $DOCKER_DIR/.env.test << EOF
ConnectionStrings__Database=Host=${TEST_DB_HOST};Port=${TEST_DB_PORT};Database=${TEST_DB_NAME};Username=${TEST_DB_USER};Password=${TEST_DB_PASSWORD};
Auth0__Domain=${TEST_AUTH0_DOMAIN}
Auth0__Audience=${TEST_AUTH0_AUDIENCE}
Auth0__ClientId=${TEST_AUTH0_CLIENT_ID}
Auth0__ClientSecret=${TEST_AUTH0_CLIENT_SECRET}
EOF"

# Test client env
pct exec $CTID -- bash -c "cat > $DOCKER_DIR/.env.test.client << EOF
NEXT_PUBLIC_SITE_URL=${TEST_SITE_URL}
NEXT_PUBLIC_API_URL=${TEST_API_URL}
NEXT_PUBLIC_AUTH0_DOMAIN=${TEST_AUTH0_DOMAIN}
NEXT_PUBLIC_AUTH0_CLIENT_ID=${TEST_AUTH0_CLIENT_ID}
NEXT_PUBLIC_AUTH0_AUDIENCE=${TEST_AUTH0_AUDIENCE}
NEXT_PUBLIC_AUTH0_REDIRECT_URI=${TEST_AUTH0_REDIRECT_URI}
EOF"

# Tunnel env — prompt for token
read -sp "Cloudflare Tunnel token for website-tunnel: " TUNNEL_TOKEN
echo ""
pct exec $CTID -- bash -c "cat > $DOCKER_DIR/.env.tunnel << EOF
TUNNEL_TOKEN=$TUNNEL_TOKEN
EOF"

# Lock down all env files
pct exec $CTID -- chmod 600 $DOCKER_DIR/.env.*
echo "  Environment files written:"
echo "    .env.prod         (API prod)"
echo "    .env.prod.client  (Client prod)"
echo "    .env.test         (API test)"
echo "    .env.test.client  (Client test)"
echo "    .env.tunnel       (Cloudflare tunnel token)"

# ─────────────────────────────────────────────
# Step 5: Build and start the stack
# ─────────────────────────────────────────────
echo ""
echo "=== Step 5/6: Building and starting the stack ==="

# Pull latest code
pct exec $CTID -- bash -c "cd $APP_DIR && git pull"
echo "  Code updated"

# Build and start
pct exec $CTID -- bash -c "cd $DOCKER_DIR && docker compose up -d --build"
echo "  Stack started"

# Wait for containers to be healthy
echo "  Waiting for containers to start..."
sleep 10
pct exec $CTID -- docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# ─────────────────────────────────────────────
# Step 6: Run EF Core migrations
# ─────────────────────────────────────────────
echo ""
echo "=== Step 6/6: Running EF Core migrations ==="

# Prod migration
echo "  Running prod migration against ${PROD_DB_HOST}..."
pct exec $CTID -- bash -c "
    export PATH=\"\$PATH:/root/.dotnet/tools\"
    cd $APP_DIR/evanbecker-api/evanbecker-domain
    dotnet ef database update \
        --connection 'Host=${PROD_DB_HOST};Port=${PROD_DB_PORT};Database=${PROD_DB_NAME};Username=${PROD_DB_USER};Password=${PROD_DB_PASSWORD};' \
        --startup-project ../evanbecker-api/evanbecker-api.csproj
"
echo "  Prod migration complete"

# Test migration
echo "  Running test migration against ${TEST_DB_HOST}..."
pct exec $CTID -- bash -c "
    export PATH=\"\$PATH:/root/.dotnet/tools\"
    cd $APP_DIR/evanbecker-api/evanbecker-domain
    dotnet ef database update \
        --connection 'Host=${TEST_DB_HOST};Port=${TEST_DB_PORT};Database=${TEST_DB_NAME};Username=${TEST_DB_USER};Password=${TEST_DB_PASSWORD};' \
        --startup-project ../evanbecker-api/evanbecker-api.csproj
"
echo "  Test migration complete"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Website LXC $CTID is fully configured!"
echo "============================================"
echo ""
echo "  Secrets:  Pulled from Infisical (zero manual editing)"
echo "  Stack:    Prod + Test running on same LXC"
echo "  DB:       Migrations applied to both databases"
echo ""
echo "  MANUAL STEPS REMAINING:"
echo "  ────────────────────────"
echo ""
echo "  1. Create Cloudflare Tunnel 'website-tunnel' (if not already done)"
echo "     Zero Trust -> Networks -> Tunnels -> Create"
echo ""
echo "  2. Add public hostname routes in the tunnel config:"
echo "     All routes point to http://traefik:80 (Traefik routes by hostname)"
echo ""
echo "     | Subdomain    | Domain          | Service         |"
echo "     |--------------|-----------------|-----------------|"
echo "     | www          | evanbecker.net  | http://traefik:80 |"
echo "     | (empty)      | evanbecker.net  | http://traefik:80 |"
echo "     | api          | evanbecker.net  | http://traefik:80 |"
echo "     | test         | evanbecker.net  | http://traefik:80 |"
echo "     | api-test     | evanbecker.net  | http://traefik:80 |"
echo ""
echo "  3. Verify in browser:"
echo "     https://www.evanbecker.net"
echo "     https://api.evanbecker.net/swagger"
echo "     https://test.evanbecker.net"
echo "     https://api-test.evanbecker.net/swagger"
echo ""
echo "  To refresh secrets from Infisical, re-run this script."
echo ""
