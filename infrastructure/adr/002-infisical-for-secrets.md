# ADR-002: Self-Hosted Infisical for Secrets Management

**Status:** Accepted
**Date:** 2026-03-21

## Context

The app has secrets spread across GitHub Actions secrets, `.env` files on the droplet, and hardcoded values in `appsettings.json`. Migrating to a homelab is an opportunity to centralize. Options considered: keep `.env` files, 1Password Secrets Automation, HashiCorp Vault, self-hosted Infisical.

## Decision

Run self-hosted Infisical on LXC 107 with its own PostgreSQL 16 and Redis as Docker sidecar containers. The LXC is completely self-contained with no outbound internet after setup. Containers on other LXCs authenticate via Machine Identity (client ID + secret) and pull secrets at startup. Only three values need to exist outside Infisical to bootstrap it: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, and `INFISICAL_SITE_URL`.

## Consequences

**Positive:**
- Single source of truth for all secrets across prod, test, and CI environments
- Machine Identity provides scoped, auditable programmatic access — no shared passwords
- Self-hosted means no SaaS dependency or data leaving the LAN
- Infisical's UI makes secret rotation straightforward

**Negative:**
- Bootstrap chicken-and-egg: the three Infisical bootstrap values must be stored somewhere (currently in `.env` files committed to no repo, injected manually)
- Infisical itself is a critical dependency — if LXC 107 is down, no service can pull secrets on restart
- Requires maintaining Infisical upgrades and its PG + Redis sidecars
