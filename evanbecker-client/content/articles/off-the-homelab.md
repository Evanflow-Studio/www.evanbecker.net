---
title: 'Nothing at Home Answers the Door'
description: 'Six months after moving this site into my basement, I moved it back out. What changed my mind, what runs where now, and the mistakes along the way.'
date: '2026-11-17'
tags:
  - infrastructure
  - software
---

On the evening of 26 October 2026 I sat down to update `cloudflared` in my house, and before I could start I had to count how many copies of it there were.

There were five. One was the website's tunnel, the one I wrote [a whole post about](/articles/self-hosting-with-cloudflare-tunnel) in May. One fronted the self-hosted secrets manager. The other three were personal things I'd set up over the years and half forgotten, each with its own connector. Four of the five had been set up by hand, outside any repo. The secrets manager's container had no route to the internet, on purpose, so I couldn't pull the new image there at all. I saved the image on the website's container, copied the tarball through the Proxmox host, and loaded it into the secrets container by hand.

The reason for the evening was a certificate authority I'd never heard of. A week earlier, at about 17:00 UTC on 19 October, Cloudflare learned that [the private keys of eight intermediate certificates from eMudhra were compromised](https://blog.cloudflare.com/emudhra-certificate-compromise/). The keys were so weak that Cloudflare's [follow-up](https://blog.cloudflare.com/emudhra-patching/) describes recovering them as close to instant. Cloudflare published a security update for `cloudflared` at 09:15 UTC the next morning, with a plain instruction: upgrade to 2026.10.2, and if you run it in a container, update the image and redeploy. By the time I got to it, the current release was 2026.10.4.

Nothing broke. All five connectors came back up. And I was less comfortable with my house than I'd been in May.

## A Month of Reading Cloudflare's Blog

Once I'd started reading Cloudflare's security posts, I kept going.

In January, Cloudflare had written up [a flaw in how its edge handled ACME validation paths](https://blog.cloudflare.com/acme-path-vulnerability/), the URLs a certificate authority uses to check you own a domain. Some WAF features were switched off on those paths, so a request shaped like a validation could reach the origin without the rules I'd assumed were in front of it. Researchers reported it in October 2025. Cloudflare fixed it and found no sign anyone had used it.

On 26 October, the same week as the eMudhra work, Cloudflare disclosed that [between 27 August and 9 September, a few customers of one Workers AI model had received responses containing data from other customers' requests](https://blog.cloudflare.com/kv-cache-exposure-remediation/). It was 155 responses, all to very long prompts, with no evidence of deliberate exploitation.

Further back, in November 2023, an attacker got into [Cloudflare's Atlassian environment](https://blog.cloudflare.com/thanksgiving-2023-security-incident/) with one service token and three service accounts that hadn't been rotated after Okta's breach the month before. In August 2025, the Salesloft Drift breach reached Cloudflare's support-case data, and Cloudflare [found 104 of its API tokens in that text and rotated them](https://blog.cloudflare.com/response-to-salesloft-drift-incident/).

Then the outages. On 18 November 2025, starting at 11:20 UTC, [Cloudflare Access sign-ins failed for most users](https://blog.cloudflare.com/18-november-2025-outage/) until a rollback at 13:05, and the platform wasn't fully normal again until 17:06. Access was the login in front of my secrets manager and my monitoring. On 5 May 2026, [restarts across Cloudflare's edge made active tunnel connections drop and try to reconnect all at once](https://www.cloudflarestatus.com/incidents/h3q019bkfw6b), from 16:49 to 22:25 UTC. I published the tunnel post the next day.

Attackers like tunnels too. In August 2024, Proofpoint wrote about [a campaign using free TryCloudflare tunnels to deliver remote access trojans](https://www.proofpoint.com/us/blog/threat-insight/threat-actor-abuses-cloudflare-tunnels-deliver-rats). In June 2026, Microsoft described [an intrusion where the attackers set up remote access through Cloudflare tunneling](https://www.microsoft.com/en-us/security/blog/2026/06/22/one-intrusion-two-cyberattackers-uncovering-parallel-threat-activity/), next to other tools, to keep a foothold inside the victim's network. The property that made a tunnel easy for me made it easy for them. A firewall lets an outbound connection through without a second look.

## What the List Doesn't Say

None of that is a case against the tunnel. `cloudflared` has [two published security advisories](https://github.com/cloudflare/cloudflared/security/advisories), from 2020 and 2023, and both were local privilege escalations on Windows. The tunnel did its job every day it ran. Cloudflare's write-ups are detailed and quick, which is a big part of why I could read any of this.

The worst outage this site had all year wasn't Cloudflare's either. In July the website's tunnel started flapping, serving 502s and Cloudflare's 1033 page. I spent an evening ruling out NIC offloading, connection tracking, queueing, the Proxmox firewall and Docker's iptables. The cause, found at the very end, was a second device on my Wi-Fi claiming the same IP address as the website's container. The stopgap I committed that night, forcing `cloudflared` onto HTTP/2, was still in the compose file in October.

So the disclosures sent me somewhere I hadn't planned to look: the other end of the tunnel.

## The Other End of the Tunnel

In May I wrote that a compromise of the website's container had a small blast radius by design. It could reach the production database on a port filtered to my own network, and that was the worst it got.

That was true as far as it went. A tunnel carries every request faithfully to whatever sits behind it. If the API has a bug, the tunnel delivers the exploit into my house as reliably as it delivers a page view. Cloudflare's WAF stands in front, and the ACME write-up is a reminder that it has edges. Behind the website's container sat a home network with my desktop on it, a NAS, the house's automation, and a CI runner that built pull requests from this public repo with the host's Docker socket mounted, which makes it root on the machine it runs on. I'd drawn the blast radius around one container, and it reached the whole house.

Then there was how much I'd handed to one company. Cloudflare held my DNS, my certificates, the tunnels into the house, and the login in front of every admin page. Each of those was a reasonable choice. Together they meant one provider's bad week was my bad week, with my home network at the end of it.

Once I'd said that out loud, the rule was short. The homelab can do compute. It doesn't expose anything of ours to the internet, even through a tunnel. If something gets in, it should land on a machine I can delete, with nothing of mine behind it.

## Where It Runs Now

The site is going back to a DigitalOcean droplet, which is where it lived for a couple of years before I brought it home. It's a 2 GB droplet at $12 a month, sized to run every public site I have, each in prod and test: this one first, then the Evanflow site and Zeroset when they're ready. Traefik routes by hostname. Every container has a memory cap and a CPU limit, so a runaway test can't starve prod.

The tunnel stayed. `cloudflared` runs on the droplet and connects out to Cloudflare, and the droplet's firewall admits nothing inbound. Everything I liked about the tunnel in May still holds: no open ports, TLS at the edge, Access in front of anything private. The machine behind it changed. It's rented, it runs only the sites, and if it's ever compromised the cost is the droplet. Nothing on it leads into my house.

Test is served too, but only to me. Every test hostname sits behind Cloudflare Access, so nothing reaches the droplet before sign-in.

::mermaid-diagram
---
code: |
  flowchart LR
      User((Visitor)) -->|HTTPS| CF[Cloudflare Edge<br/>DNS, TLS, Access]
      subgraph DO["DigitalOcean (no inbound ports)"]
          direction LR
          CFD[cloudflared] --> Traefik
          Traefik --> Apps[Sites and APIs<br/>prod and test]
          Apps --> PG[(Managed Postgres)]
          Sync[secrets sync]
      end
      CFD <-.->|outbound tunnel| CF
      Sync -.->|reads with the droplet's own identity| KV[Azure Key Vault]
      subgraph Home["My House (accepts nothing)"]
          Worker[Runners and workers]
      end
      Worker -.->|reaches out for work| Apps
caption: Dotted lines are connections opened from the inside. The droplet dials out to Cloudflare and to its vault, and the house only ever reaches out.
---
::

The databases moved to one managed Postgres 18 cluster at $15.15 a month. Each app and environment gets a database and a login of its own, and `CONNECT` is revoked from everyone else, so no login can open another app's data. The website's entire production database is 8 MB. I'm paying for the cluster mostly so I never run a Postgres server again.

Secrets moved from the self-hosted secrets manager, the container with no internet, to Azure Key Vault, which costs pennies a month under a $5 budget alert. The droplet reads its vaults through Azure Arc, which gives the machine an identity of its own. A timer reads the vault with that identity and writes each service's secrets to a file in memory that only root can read. There's no password on the droplet for fetching the passwords. The one time I needed a shell on it, to connect Arc, the firewall opened SSH to my address alone and closed again after.

The infrastructure is Terraform, and it applies only when I press a button in GitHub. The pipeline signs in to Azure with OIDC and federated credentials, so no cloud secret is stored in GitHub. Secrets the pipeline creates, like database logins and tunnel tokens, go from the provider's response straight into Key Vault. Terraform's state keeps their names and versions, never their values.

Deploys pull. A small agent on the droplet reads the desired state from the infrastructure repo, pulls the images CI built for each commit from GitHub's container registry, runs the migrations, starts the containers and checks their health. CI builds the images and never connects to the droplet. Prod runs only image digests pinned in a file that changes by pull request.

The pipeline runs on a Raspberry Pi 5 that does nothing else, because while an apply runs it holds write access to Azure.

Test moved first. Prod follows at the cutover, one hostname at a time, and then the last of the site's tunnels into the house goes away. The homelab keeps doing compute, and it reaches out for its work. That part gets [its own post](/articles/homelab-reaches-out).

## The Wrong Turns

Most of this was built by Claude Code sessions I directed, one for the infrastructure repo and one for this site, through pull requests I reviewed. Nearly every mistake surfaced the same way: a pipeline run failed, or did less than it should have, and the fix was another pull request.

The Pi went first. The cloud-init that Raspberry Pi Imager wrote created my user without sudo, so the first `sudo` told me I wasn't in the sudoers file. Once it was a runner, Terraform's lock file turned out to need a hash for every platform that runs it, and ours had none for `linux_arm64`. On the Pi, `terraform init` added one and the lock check failed.

The first apply that should have created the vaults reported "0 added." The vaults pull request was stacked on the pipeline pull request, and when I merged it at 05:43 UTC on 16 November, it merged into its base branch instead of `main`. The apply on `main` a minute later had nothing to create. Another pull request brought the branch to `main`, and the runbook now says a pull request's base must be `main` before I merge it.

On 17 November the secrets apply wrote both of its secrets and then failed its own check, the one that proves no secret value landed in Terraform's state. It named both secrets, which looked like exactly the failure the check exists to catch. A diagnostic that printed only each value's type and length told the real story: two strings of length zero. The Azure provider has no null string, so it saves a write-only secret's value as `""`. Nothing had leaked. The check now treats an empty value as no value.

Cloudflare refused two DNS records the same night because their comments were 110 characters long, and it allows 100. Neither record changed, and the rest of the apply went through. The fix shortened the comments and added a check that fails the plan when one runs long.

Then the droplet couldn't pull the site's images. They're private on GitHub's registry, and an anonymous pull gets a 403. I chose a read-only pull token in the droplet's vault over making the images public. The agent logs in with it on stdin and keeps the login in memory.

The agent's own update took two deploys. The first run installed the new agent and carried on with the old code it was already running, and only the second run used the new code. Now a new agent replaces the running process within the same run.

None of these were dangerous. Each one showed up because something checked, failed loudly, or reported a number that didn't match what I expected.

## What I Turned Down

Azure first, since the secrets were already there. Its free tiers look generous until you read them. Free container hosting scales to zero and cold-starts on the next visit, there's no free Postgres, and pay-as-you-go has no hard spending cap. A budget alert tells you after the money's gone.

A test VM on the homelab, behind its own tunnel, got as far as code. The pipeline had already created its tunnel when I decided against it, because it would still have been serving from home.

Push deploys over SSH are the usual way to do this, and they'd have put a key with root on prod into CI. With the pull agent, CI holds nothing that can reach the droplet.

## What I'd Recommend Now

Until this week, the May post ended by recommending a Cloudflare Tunnel on hardware you already own over a $5 droplet. I've revised it, because I don't recommend that anymore.

Put the part that faces the internet on a cheap box in the cloud. Mine is 2 GB because it holds four environments, and a single personal site with its API needs less. Keep a tunnel and Access in front of it if you like them. I do. Keep its secrets off the box, and let the box read them with an identity instead of a password.

Then give the machine at home the work it's good at, and let it take that work without accepting a single connection. A worker on the homelab polls an API on the cloud box, takes a job, and reports back. Nothing at home listens. The cloud box costs a little every month. The machine at home is already paid for, and it's worth more to you running builds, models and batch jobs than answering strangers.

The DigitalOcean line items are back on my bill, about $27 a month for the droplet and the cluster. In May I counted that as the cost of the cloud. Now it reads more like the price of keeping strangers out of my house.

The next time Cloudflare ships a security update for `cloudflared`, I'll update one connector, on a machine with nothing else on it, through a pull request. I still think the tunnel is one of the best free things on the internet. The house will keep working in the basement, and when someone knocks, nothing at home will answer.
