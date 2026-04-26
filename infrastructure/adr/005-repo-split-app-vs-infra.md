# ADR-005: Split App Code and Infrastructure Into Separate Repos

**Status:** Accepted
**Date:** 2026-03-21

## Context

The current monorepo (`www.evanbecker.net`) contains Nuxt 3, the .NET API, GitHub Actions workflows, Dockerfiles, and a growing `infrastructure/` tree of LXC setup scripts, Proxmox configuration, and ADRs. App code and infrastructure have different change cadences, different audiences, and ideally different access controls.

## Decision

Keep all application code in `www.evanbecker.net`: Nuxt 3 frontend, .NET API, GitHub Actions workflows, and Dockerfiles. Move all infrastructure into a new `evanbecker-infra` repo: LXC setup scripts (`infrastructure/scripts/`), Proxmox configuration guides, Docker Compose server templates, and ADRs. The two repos live side-by-side locally so Claude Code and other tooling can work across both from a shared parent directory.

## Consequences

**Positive:**
- Clear separation of concerns — an app deploy never touches infra history and vice versa
- Different GitHub permissions can be applied (e.g., infra repo is private with stricter access)
- Infra changes don't pollute app commit history and CI triggers
- Easier to open-source the app repo without exposing internal network topology

**Negative:**
- Changes that span both (e.g., a new service requiring both app code and a new LXC) require PRs in two repos
- Local setup requires cloning two repos; cross-repo search requires tooling awareness of both paths
- ADRs (like this one) exist in the infra repo and may not be visible to contributors who only have app repo access
