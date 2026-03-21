# ADR-004: Watchtower for Automated Deployments

**Status:** Accepted
**Date:** 2026-03-21

## Context

CI needs to deploy new images to the website LXC (109) after a successful build. Options considered: SSH from the GitHub Actions runner into LXC 109 and run `docker compose pull && up`, webhook listener on LXC 109, or Watchtower polling the local registry.

## Decision

Run Watchtower as a Docker Compose service on LXC 109. It monitors the local Docker registry on LXC 108 (`192.168.0.168:5000`) for updated image tags and automatically pulls and restarts containers when a new image is pushed. The GitHub Actions runner only needs to build and push — it never touches LXC 109 directly.

## Consequences

**Positive:**
- Zero SSH access required from CI to the website LXC — reduces attack surface
- Simple setup; Watchtower requires no custom code
- Deployment is triggered purely by a registry push, which is a clean boundary

**Negative:**
- EF Core database migrations must run in the CI pipeline (before the image push) rather than at app startup — the app image must be deployable without running migrations itself
- Watchtower polling interval introduces a short deploy lag (configurable, default 30s)
- If a bad image is pushed, Watchtower will deploy it automatically — no approval gate between push and deploy (acceptable given the test → prod branch model)
