# ADR-003: Cloudflare Tunnel Per Service (Sidecar Pattern)

**Status:** Accepted
**Date:** 2026-03-21

## Context

All LXCs are on a private LAN (`192.168.0.0/24`) with no port forwarding from the router. External traffic needs a way in. Options considered: (1) dedicated tunnel LXC that proxies everything, (2) one cloudflared container routing all hostnames, (3) one cloudflared sidecar per externally-accessible service.

## Decision

Each service that requires external access (website LXC 109, Infisical LXC 107, n8n LXC 103) runs its own `cloudflared` container as a Docker Compose sidecar with its own named Cloudflare tunnel. Each tunnel is scoped to the hostnames that service owns.

## Consequences

**Positive:**
- Independent lifecycles — restarting the website tunnel does not affect Infisical access
- No single point of failure for external ingress
- Each tunnel's credentials and scope are isolated to the service that needs them
- Matches Cloudflare's recommended per-service tunnel model

**Negative:**
- More tunnels to create and manage in the Cloudflare Zero Trust dashboard
- Each service needs its tunnel token injected as a secret (handled by Infisical)
- Slightly more resource usage vs. a single shared tunnel process (negligible in practice)
