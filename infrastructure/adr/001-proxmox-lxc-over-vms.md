# ADR-001: Use LXC Containers Instead of VMs in Proxmox

**Status:** Accepted
**Date:** 2026-03-21

## Context

Migrating from a single DigitalOcean droplet running everything on one host. Proxmox VE supports both full VMs (KVM) and OS-level containers (LXC). Each service needs isolation but the host machine (i5-12600K, 32GB RAM) has finite resources that need to stretch across 6+ containers.

## Decision

Use unprivileged LXC containers with `nesting=1` for all services. Docker runs inside LXC rather than each service getting a full VM. Services that don't need Docker (e.g., simple single-binary installs) still use LXC for consistency.

## Consequences

**Positive:**
- Significantly less overhead than KVM VMs — no hypervisor per guest, no full OS boot, shared kernel
- Sub-second start/stop vs. 20–40s for VMs
- Smaller disk footprint per container
- Firewall and network config is identical to VMs in Proxmox

**Negative:**
- `nesting=1` is required for Docker-in-LXC; this must be set while the LXC is stopped
- All containers share the host kernel — a kernel exploit could affect all of them (acceptable for homelab threat model)
- Some Docker images with unusual kernel requirements may not work inside LXC
