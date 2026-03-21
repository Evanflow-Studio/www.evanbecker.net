# ADR-006: Self-Hosted GitHub Actions Runner with Colocated Docker Registry

**Status:** Accepted
**Date:** 2026-03-21

## Context

GitHub-hosted runners have no access to the private LAN (`192.168.0.0/24`). Reaching Infisical (LXC 107) or the PostgreSQL databases (LXC 105/106) for EF Core migrations would require Cloudflare Access service tokens and tunnel complexity. GHCR could host images, but pulling from GHCR on LXC 109 still requires internet access and authentication on the website LXC.

## Decision

Run a self-hosted GitHub Actions runner on LXC 108 alongside a `registry:2` Docker registry. The runner builds images, pushes them to the local registry (`192.168.0.168:5000`), and runs EF Core migrations directly against LXC 105/106 (LAN access, no firewall complexity). LXC 109 pulls images from `192.168.0.168:5000` via Watchtower — entirely within the LAN.

## Consequences

**Positive:**
- Runner has direct LAN access to Infisical, both databases, and the website LXC — no tunnels or service tokens needed for CI
- Images never leave the LAN; no GHCR auth, no egress costs
- EF Core migrations run in CI with full DB access, keeping app containers stateless at startup

**Negative:**
- Self-hosted runner executes untrusted workflow code (e.g., code from a forked PR) — the runner is isolated in its own LXC to contain any blast radius
- Runner and registry must be maintained (updates, disk space management for old image layers)
- If LXC 108 is down, CI is completely blocked — no fallback to GitHub-hosted runners
