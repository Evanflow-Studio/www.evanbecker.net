---
title: 'Self-Hosting With a Cloudflare Tunnel'
description: "After a couple years on DigitalOcean, I moved evanbecker.net onto a Proxmox box in my basement. The networking is the interesting part. A handful of LXC containers and a Cloudflare Tunnel, with zero open ports."
date: '2026-05-06'
tags:
  - infrastructure
  - software
---

For most of the time evanbecker.net has been online, it lived on a DigitalOcean droplet. I have nothing bad to say about DigitalOcean. They're who I'd send a friend to today if a friend wanted a managed VPS, and I was a paying customer for a couple of years without a single outage I could blame on them. The droplet was a good droplet.

It was also a droplet I didn't need. Sitting four feet from my desk, an i5-12600K Proxmox host I'd built for an unrelated project was idle most of the day. The droplet, doing even less than that, sat at about 4% CPU. Two machines doing nearly the same amount of nothing, in different buildings, on different bills.

The cost saving was part of it. The bigger part was two questions I'd been avoiding for years. Could I actually run a production stack on hardware I had physical control over? And could I do it without any of the things I'd always assumed self-hosting required, like port forwards on a residential router, a static IP from my ISP, or a VPN I'd have to maintain on every device I owned? The bill was the excuse. The questions were the reason.

The second question is the one Cloudflare Tunnel answered. It turns out the answer to "how do I expose a service to the internet without opening a port" is: don't expose a service. Have the service phone home to Cloudflare, and let Cloudflare answer the door.

My Proxmox box runs about a dozen things now. The website itself is Nuxt and dotnet, but those are application-layer details and they could just as easily be PHP, or Go, or a single static folder. The portable part, the part that works the same whether you're hosting one site or fifteen services, is the networking.

## What Cloudflare Tunnel Actually Does

A Cloudflare Tunnel is a daemon called `cloudflared` that runs on your server and opens an outbound connection to Cloudflare's edge. That outbound connection is the tunnel. When somebody hits `www.evanbecker.net`, the request lands on Cloudflare's network. Cloudflare looks up which tunnel `www.evanbecker.net` is bound to, finds the connection my daemon already has open, and pushes the request down it. My server replies the same way back.

::mermaid-diagram
---
code: |
  flowchart LR
      User((Visitor)) -->|HTTPS| CF[Cloudflare Edge]
      subgraph Home["My House (no inbound ports)"]
          direction LR
          CFD[cloudflared] --> Traefik
          Traefik --> App[App container]
      end
      CFD <-.->|outbound tunnel| CF
caption: Request flow. The tunnel is opened outbound by cloudflared, so no port on the home network ever has to listen.
---
::

The implication is the part I want to land on. There is no inbound connection to my house. There is no port to forward, no firewall rule to misconfigure, no static IP to rent. My router does what it's been doing since I plugged it in: nothing, from the outside. The tunnel is outbound, like a browser tab is outbound. As far as the public internet is concerned, my server isn't on the public internet at all.

Cloudflare also handles TLS, DDoS shaping, caching, WAF rules, and bot detection in front of all of this. The certificate for `www.evanbecker.net` lives at Cloudflare's edge. I don't run Let's Encrypt. I don't renew anything. If somebody decides to run a 10 Gbps flood at me, it gets shaped by Cloudflare's network before it ever reaches the tunnel. None of that is something I have to configure. It's just on.

The free tier covers all of this. I haven't paid Cloudflare a dollar.

## The Proxmox Layout

The host is a single box. An i5-12600K with 32 GB of RAM and a couple of SSDs. Proxmox VE runs on the metal, and the rest is LXC containers.

I went with LXCs over full VMs for a reason worth saying out loud. An LXC is a lightweight Linux userland sharing the host kernel. A VM is a whole virtualized machine with its own kernel. For homelab workloads, the VM overhead buys you almost nothing and costs you a lot. LXCs start in under a second. They share filesystem caches with the host. You can run forty of them on hardware that would choke on five VMs.

The current layout, mapped to IP and purpose:

| LXC | Hostname | What it runs |
|-----|----------|--------------|
| 105 | docker-db-prod | PostgreSQL 18, prod database |
| 106 | docker-db-test | PostgreSQL 18, test database |
| 107 | infisical | Self-hosted secrets manager |
| 108 | ci | Self-hosted GitHub Actions runner + Docker registry |
| 109 | website | Traefik + the app containers + cloudflared + Watchtower |

LXC 109 is the only container with a public tunnel for the website hostnames. LXC 107 has its own tunnel for `secrets.evanbecker.net`. Everything else (databases, CI registry) is reachable only from inside `192.168.0.0/24`, and not all of them even from there. The database LXCs have no DNS resolver and no outbound internet. They speak PostgreSQL on port 5432 to a small set of allowed IPs and that's it.

::mermaid-diagram
---
code: |
  flowchart TB
      Internet((Internet)) -->|tunnel| L109
      Internet -->|tunnel| L107

      subgraph LAN["LAN  -  192.168.0.0/24"]
          direction TB
          L109[LXC 109<br/>website + Traefik]
          L107[LXC 107<br/>Infisical]
          L108[LXC 108<br/>CI runner + registry]
          L105[(LXC 105<br/>Postgres prod)]
          L106[(LXC 106<br/>Postgres test)]
          Proxmox[Proxmox host UI]

          L109 -->|5432| L105
          L109 -->|5432| L106
          L109 -->|8080| L107
          L108 -->|registry pulls| L109
      end

      classDef public fill:#0C65E5,stroke:#0C65E5,color:#fff
      classDef private fill:#1e293b,stroke:#475569,color:#cbd5e1
      class L109,L107 public
      class L108,L105,L106,Proxmox private
caption: Blue boxes have public tunnels. Everything else only exists on the LAN. The Proxmox UI and both Postgres LXCs are deliberately not reachable from the internet at all.
---
::

The blast radius of a compromise on LXC 109 is small by design. Whatever pops the website container can talk to prod Postgres on a port that's already filtered to my own LAN, and that's the worst it gets. The rest of the network stays the rest of the network.

## Why a Tunnel Per Service, Not One Tunnel for Everything

Cloudflare gives you two ways to set this up. You can run one tunnel that proxies every hostname you own, or you can run a tunnel per service. I run a tunnel per service.

The reason is independent lifecycles. The website tunnel restarts on every deploy. If that same tunnel were also fronting Infisical and the secrets UI, every site deploy would briefly knock secrets offline. With separate tunnels per externally-facing service, restarting one doesn't move the other. Cloudflare also recommends this layout, which makes sense once you see the failure modes.

Concretely, `cloudflared` runs as a Docker sidecar in the same Compose file as the service it fronts. The website's tunnel lives next to Traefik on LXC 109. Infisical's tunnel lives next to Infisical on LXC 107. Each one has its own token and its own scope of hostnames in the Cloudflare Zero Trust dashboard.

It's slightly more management. It's also a lot less coupling.

## The Sidecar Pattern in Practice

Here's the meaningful slice of LXC 109's Compose file:

```yaml
services:
  traefik:
    image: traefik:v3.3
    networks: [internal]
    # ... routing config

  evanbecker-client:
    image: registry/evanbecker-client:latest
    networks: [internal]
    labels:
      - traefik.http.routers.client.rule=Host(`www.evanbecker.net`)

  evanbecker-api:
    image: registry/evanbecker-api:latest
    networks: [internal]
    labels:
      - traefik.http.routers.api.rule=Host(`api.evanbecker.net`)

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks: [internal]
```

That's the shape of it. `cloudflared` joins the same Docker network as Traefik. In the Cloudflare Zero Trust dashboard, every public hostname is configured to point at `http://traefik:80`. Cloudflared receives the inbound request from the tunnel, hands it to Traefik over the internal Docker network, and Traefik routes by hostname to whichever app container should answer.

The host machine has no port 80 or 443 open. The Proxmox firewall on LXC 109 is configured to allow LAN inbound only, with outbound left open so cloudflared can keep the tunnel alive. The only way traffic reaches Traefik is through cloudflared, and the only way it reaches cloudflared is through Cloudflare's edge.

Setting this up the first time is mostly clicking through the Cloudflare dashboard. You create a tunnel, copy the token, drop it in your `.env`, and add public hostnames pointing at your service. There's no DNS to configure separately. Cloudflare creates the CNAMEs for you.

## The VPN I Don't Have to Run

The same tunnel infrastructure that fronts the website also fronts internal admin UIs. Infisical's web UI at `secrets.evanbecker.net`. Uptime Kuma's admin dashboard at `monitoring.evanbecker.net`. Each is a public hostname pointing at an LXC's internal IP, with no port forwards on the router and no inbound exposure to the LAN.

I hit the hostname from anywhere on the internet. Cloudflare Access challenges me first, emails a six-digit code to my address, takes the code, gives me a session that lasts a week. Then I land on the app's own login screen. Two layers, neither of which I built. Anyone whose email isn't on the allow-list never sees Infisical at all. They get a Cloudflare-hosted login page and that's it.

The flip side is the services that don't get a tunnel. The Proxmox web console stays LAN-only. The Postgres LXCs stay LAN-only. If I want to manage the host or touch a database, I'm doing it from a machine actually on `192.168.0.0/24`. The choice of which services to expose is per-hostname, and "don't expose this one" is a valid answer for anything where the surface area behind the login isn't worth gating in just one layer.

This is the setup that replaced the WireGuard idea I used to have. No client configs on every device. No DNS routing inside a tunnel. No checking "is the VPN up" before I can pull up Infisical from my phone. Just a hostname, an email code, and the app's own login.

The Access piece itself is about as light as it gets. In the Cloudflare Zero Trust dashboard, add a Self-hosted Application bound to the hostname, attach a policy that allows your email, pick an Identity Provider. One-time PIN works fine for personal use and needs no external IdP. Cloudflare's edge enforces the policy before any request reaches the tunnel. The free tier covers fifty users.

I'm not a Cloudflare salesman. The free tier is generous to a degree that feels like a mistake on their part, and I'm going to keep using it until they tell me otherwise.

## What It Actually Costs

Money: zero on Cloudflare. The LXC host is hardware I already had. The DigitalOcean line items are gone.

Time: a weekend of work to migrate, plus the usual amount of homelab fiddling once it was running. Most of it spent in the Cloudflare dashboard rather than on the Proxmox box, which I took as a good sign.

Risk: lower than the cloud setup it replaced. The droplet had port 443 open to the internet by definition. The LXC host doesn't. The droplet's TLS config was my responsibility. The tunnel's isn't. If my home internet drops, the site goes down, and that's the real tradeoff of self-hosting. In return, I get SSH-less deploys, a CI runner that builds and pushes faster than any cloud runner I've used (because it's on the LAN with the registry), and a backup story that's a Proxmox snapshot away.

The "if my home internet drops, the site goes down" part is the bit I'm currently working on smoothing over. Cloudflare's free tier includes Always Online, which keeps a static cached copy of public pages at the edge and serves it when the origin can't be reached. Set it up, configure cache rules for the routes you want preserved, and when the tunnel goes silent the public site stays up from cache while the dynamic stuff (anything that hits the API or the database) is temporarily unavailable. I get an Uptime Kuma alert, the article pages keep serving, search engines don't see a 5xx, and I have a real window to actually fix things instead of racing the SEO penalty. Not in production yet, but close. The fact that it's free is, again, suspicious.

## What This Looks Like If You Don't Have a Homelab

The setup I just described scales down further than you might think. You don't need an i5-12600K. You don't need Proxmox. You don't even need LXCs.

If all you want to do is host a static site or one or two small services, you need:

1. A Linux box. Anything. A Raspberry Pi 4 has more than enough horsepower for a static site, a small API, and a cloudflared sidecar. An old laptop with a busted screen works. A mini PC for $150 is overkill.
2. Docker.
3. A Cloudflare account and a domain.
4. The four-line cloudflared service in your Compose file.

Skip the LXCs. Just run Docker Compose on the host. Skip the multi-tunnel setup until you have more than one service. Skip the firewall hardening if your machine isn't running anything else interesting. Start with one tunnel, one hostname, one container. The setup that grew into my five-LXC Proxmox stack started as one Compose file with three services on a single Ubuntu install.

The thing the cloud actually sells, and the thing it's worth paying for sometimes, is uptime guarantees and network engineering you don't want to do yourself. For a personal site, a side project, an internal tool, a status page, a hobby app, a Discord bot, the uptime guarantee mostly comes from the fact that nobody notices if you go down for an hour at 3 AM on a Tuesday. For everything in that category, hardware you already own plus a Cloudflare Tunnel is a better answer than a $5/mo droplet.

What I didn't expect, after moving everything off the cloud, was how much more I'd touch the infrastructure. When the box was a DigitalOcean rental, I treated it like a hotel room. Don't customize, don't get attached, log in only when something's broken. Now that it's mine, I add services casually. A status page. Uptime monitoring. A test environment that costs nothing because it's just another set of containers on the same box. The friction of "is this worth a new $5/mo line item" is gone, and a lot of small useful things end up getting built that wouldn't have been otherwise.

If you've got a machine sitting idle and a domain you bought once, you've already paid for most of this. The rest is a weekend and a cloudflared container.
