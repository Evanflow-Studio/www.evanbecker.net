# Architectural Decision Records

Lightweight records of key architectural decisions for the evanbecker.net homelab migration. Each ADR captures context, the decision made, and its consequences.

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](001-proxmox-lxc-over-vms.md) | Use LXC containers (with Docker nesting) instead of full KVM VMs in Proxmox | Accepted |
| [ADR-002](002-infisical-for-secrets.md) | Self-hosted Infisical on LXC 107 as the single source of truth for all secrets | Accepted |
| [ADR-003](003-cloudflare-tunnel-per-service.md) | Run one cloudflared sidecar per externally-accessible service rather than a shared tunnel | Accepted |
| [ADR-004](004-watchtower-for-deploys.md) | Use Watchtower on LXC 109 to deploy new images automatically from the local registry | Accepted |
| [ADR-005](005-repo-split-app-vs-infra.md) | Split app code (www.evanbecker.net) and infrastructure (evanbecker-infra) into separate repos | Accepted |
| [ADR-006](006-self-hosted-runner-with-registry.md) | Self-hosted GitHub Actions runner on LXC 108 with a colocated Docker registry instead of GitHub-hosted runners + GHCR | Accepted |
