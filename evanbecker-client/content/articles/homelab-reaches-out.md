---
title: 'A Homelab That Only Reaches Out'
description: 'With the website moving out, the server in my basement becomes compute: a second RTX 3060, a 4 TB NVMe drive, and one rule, that it never accepts a connection.'
date: '2026-11-17'
tags:
  - infrastructure
  - ai
---

On 15 November I ran a profiling script against my Proxmox host to size the droplet the website was about to move to. Over the previous week, the website's container had peaked at 545 MiB of memory, prod and test together, and its CPU had never gone above a fifth of one core. The host has an i5-12600K with 16 threads and 64 GB of RAM. The job I'd written the most about on this machine had used almost none of it.

The website is moving off the homelab, for reasons I went through in [Nothing at Home Answers the Door](/articles/off-the-homelab). The server stays. What it's for is changing.

## The Hardware

The server is going to two RTX 3060 12 GB cards, 24 GB of VRAM between them. In October a used 3060 was going for about $290, roughly $24 per gigabyte of VRAM, at a time when the memory shortage had pushed every RAM, GPU and drive price up. A used 3090 would have put 24 GB on one card, for around $1,200 and probably a bigger power supply. I also looked at moving the workstation's 4070 Super into the server. It has the same 12 GB, and the workstation around it has 96 GB of fast DDR5, which makes it the best machine I own for the largest models. It stays where it is.

The motherboard made part of the decision. It's an MSI Z690 with one slot wired to the CPU at PCIe 5.0 x16, and the others at PCIe 3.0 x4 through the chipset, with no way to split the lanes evenly. For some workloads that would be a dealbreaker. For splitting a model across two cards layer by layer, an x4 slot mostly costs loading time, and generation speed barely moves.

It also has a 4 TB Samsung 990 PRO now, as a fast pool for model weights, VM disks and runner work.

## One Rule, and the Ones It Implies

The rule from the move holds here too. Nothing on the homelab is served to the internet, not even through a tunnel. It does compute, and it reaches out for that work: a worker on the homelab calls an API on the droplet with a short-lived token, takes a job, and reports back. Nothing calls in. When the homelab is off, the products carry on without it.

Anything that runs Docker or untrusted code gets a VM from now on. In May I liked LXCs because they share the host's kernel and start in under a second. Sharing the kernel is also what makes a container escape land on the host, and a box that runs pull-request code shouldn't be one escape away from Proxmox.

A runner never changes its own host. No pipeline job may reconfigure, reboot or upgrade the machine it's running on. Changes to the Proxmox host come from outside it, by hand at first, and later from a runner on a different machine.

Claude reads, and the pipeline writes. Agents get a read-only Proxmox token through an MCP server, enough to see every guest, every disk and every config, and not enough to change any of them. Sandboxes get a token scoped to a pool of throwaway VMs. Real changes go through a pull request I merge.

The guests fall into three tiers. Some must not break: the host, the NAS, the house's automation. Some are work: runners, models, agents. And some are play: game dev and sandboxes, the things that can be turned off when the others need the room.

## What It Will Run

The GPUs go to an `ai` VM, and its first jobs are the unglamorous ones everything else depends on. Embeddings for search. Rerankers and classifiers. A model small enough to stay loaded all day, for summaries and triage, the chores that don't need a frontier model. Twenty-four gigabytes holds a model of roughly 30 billion parameters at 4-bit quantization, entirely in VRAM. The frontier models stay in the cloud for the real work.

Next to it, an index database: Postgres with vector search, holding the embeddings for our knowledge base. That's the set of pages describing what each product should be, the checks that say whether it is, and the decisions behind both. It's how an agent finds out what we've already decided before it decides something again.

CI runners for our private repos move into VMs of their own, started clean for each job and thrown away after. A GitHub runner registers by reaching out, so they need nothing inbound either.

Zeroset gets background work. When Zeroset has something heavy to do, the homelab asks the droplet for a job, does it on the GPUs, and posts the result back. If the homelab is off, Zeroset carries on, and the work waits.

There's also an asset catalog. Game work means a lot of bought content, spread across several stores and drives. The homelab will keep a thin catalog of what we own: names, metadata, screenshots and previews, grouped into packs by decisions we make. The files come down only when a game uses them. The catalog is for search, and nothing in it trains anything.

And the agents get homes. Long-running Claude Code sessions get VMs of their own, one for this website and its blog, one for Zeroset. Each gets the read-only token and its own repos, and none of them can change the host.

## The Boring Part First

None of that comes before the data has a second copy. The server's largest dataset lives on one SMR drive, in a pool that reported a data error in the last inventory. ZFS snapshots run every 15 minutes, but Proxmox had no scheduled backup job of its own. The drives come first: two CMR NAS drives to mirror that pool, then a UPS. A slow model can wait. A dead drive can't be undone.

After that, RAM is the real limit. The guests planned for the first two tiers take about 54 of the 64 GB. Either the heavy jobs run as modes, so a big model, game dev and the full set of agents never run at once, or the server goes to 128 GB of DDR4. That's the biggest single upgrade on the list, and DDR4 prices have been climbing, so I'm pricing it before I buy.

## Where It Points

The workstation and the laptop are still where things get built. The homelab supports them: it runs the CI, holds the index, does the embeddings and stores the files. What changes is how much of the support can happen without me. The plan is that an agent who needs to know whether a page is stale, or which asset fits a scene, asks the homelab, and the homelab has already done the slow part.

How the agents use it is its own story, and I'm still running those experiments.

The website used a fifth of one core on this machine. The next things it runs will use all sixteen threads and both cards, and none of them will be reachable from outside my house. I trust the server more with that job than I did when it was answering the door.
