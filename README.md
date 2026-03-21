<a name="readme-top"></a>

# www.evanbecker.net

[![Stars][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<br />
<div align="center">
  <a href="https://www.evanbecker.net">
    <img src="evanbecker-client/src/images/logos/evanbecker-icon.svg" alt="Logo" width="120" height="120">
  </a>

  <h3 align="center">www.evanbecker.net</h3>

  <p align="center">
    A full-stack personal portfolio, blog, and contact platform — self-hosted on a Proxmox homelab.
    <br />
    <a href="https://www.evanbecker.net/articles"><strong>Read the Blog &raquo;</strong></a>
    <br />
    <br />
    <a href="https://www.evanbecker.net/projects">Projects</a>
    &middot;
    <a href="https://www.evanbecker.net/contact">Contact</a>
    &middot;
    <a href="https://test.evanbecker.net">Test Environment</a>
  </p>
</div>

---

## About

This is the monorepo powering [evanbecker.net](https://www.evanbecker.net) — a personal site with blog articles (written in MDX), an authenticated commenting system, a contact form, newsletter signup, and a projects showcase. The frontend is a Next.js application and the backend is a .NET API backed by PostgreSQL.

The entire stack is self-hosted on a Proxmox VE homelab with isolated LXC containers, Cloudflare Tunnel for zero-open-port ingress, and Infisical for secrets management.

## Built With

* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![TailwindCSS][TailwindCSS]][TailwindCSS-url]
* [![Dotnet][Dotnet]][Dotnet-url]
* [![Postgres][Postgres]][Postgres-url]
* [![Docker][Docker]][Docker-url]
* [![GitHub Actions][GitHub]][Github-url]
* [![Proxmox][Proxmox]][Proxmox-url]
* [![Cloudflare][Cloudflare]][Cloudflare-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Architecture

Four views of the system — from high-level application flow down to network security.

### View 1: Application (How Users Interact)

```mermaid
graph LR
    User((User)) -->|browser| CF[Cloudflare Edge<br/>TLS + CDN]
    CF -->|www / test| Client[Next.js<br/>Frontend]
    CF -->|api / api-test| API[.NET API]
    Client -->|fetch| API
    API -->|read/write| DB[(PostgreSQL)]
    User -->|Auth0 login| Auth0[Auth0<br/>Identity Provider]
    Auth0 -->|JWT token| Client
    Client -->|JWT in header| API
```

**What the user sees:**
- Browse the site, read MDX blog articles, view projects
- Log in via Auth0 to post comments and replies
- Submit contact form messages and newsletter signups
- All served over HTTPS with Cloudflare handling TLS

### View 2: Service Topology (How Containers Connect)

```mermaid
graph TB
    subgraph LXC109["LXC 109 — Website (192.168.0.169)"]
        direction TB
        Traefik[Traefik<br/>Reverse Proxy]
        APIProd[API Prod<br/>.NET 10]
        APITest[API Test<br/>.NET 10]
        ClientProd[Client Prod<br/>Next.js 15]
        ClientTest[Client Test<br/>Next.js 15]
        Watchtower[Watchtower<br/>Auto-deploy]
        CFD109[cloudflared<br/>Tunnel]

        Traefik --> APIProd
        Traefik --> APITest
        Traefik --> ClientProd
        Traefik --> ClientTest
    end

    subgraph LXC107["LXC 107 — Infisical (192.168.0.107)"]
        direction TB
        Infisical[Infisical<br/>Secrets API]
        PG16[PostgreSQL 16<br/>Infisical data]
        Redis[Redis<br/>Cache]
        CFD107[cloudflared<br/>Tunnel]
    end

    subgraph LXC108["LXC 108 — CI (192.168.0.168)"]
        direction TB
        Runner[GitHub Actions<br/>Runner]
        Registry[Docker<br/>Registry]
    end

    subgraph LXC105["LXC 105 — DB Prod (192.168.0.105)"]
        PGProd[(PostgreSQL 18<br/>evanbecker)]
    end

    subgraph LXC106["LXC 106 — DB Test (192.168.0.106)"]
        PGTest[(PostgreSQL 18<br/>evanbecker_test)]
    end

    APIProd -->|tcp/5432| PGProd
    APITest -->|tcp/5432| PGTest
    Runner -->|pull secrets| Infisical
    Runner -->|run migrations| PGProd
    Runner -->|run migrations| PGTest
    Runner -->|push image| Registry
    Watchtower -->|pull image| Registry
```

### View 3: Deployment Pipeline (How Code Gets to Production)

```mermaid
graph LR
    Dev[Developer] -->|git push| GH[GitHub]
    GH -->|webhook| Runner[Self-hosted Runner<br/>LXC 108]
    Runner -->|1. pull secrets| Infisical[Infisical<br/>LXC 107]
    Runner -->|2. run migrations| DB[(Database<br/>LXC 105/106)]
    Runner -->|3. build image| Image[Docker Image]
    Image -->|4. push| Registry[Registry<br/>LXC 108:5000]
    Watchtower[Watchtower<br/>LXC 109] -->|5. detect new image| Registry
    Watchtower -->|6. pull + restart| Website[Website<br/>LXC 109]

    style Runner fill:#f9f,stroke:#333
    style Watchtower fill:#9f9,stroke:#333
```

**Deployment is atomic:** if migrations fail at step 2, the workflow stops. No new image is pushed, Watchtower sees nothing, the old version keeps running.

| Branch | Deploys To | URL |
|---|---|---|
| `main` | Test | `test.evanbecker.net` / `api-test.evanbecker.net` |
| `release` | Production | `www.evanbecker.net` / `api.evanbecker.net` |

### View 4: Network Security (What Can Talk to What)

```mermaid
graph TB
    Internet((Internet))

    subgraph Cloudflare["Cloudflare (Zero Trust)"]
        Edge[TLS Termination<br/>DDoS Protection<br/>CDN Cache]
        Access[Cloudflare Access<br/>Auth0 SSO Gate]
    end

    subgraph Proxmox["Proxmox VE — 192.168.0.47 — vmbr0 bridge"]

        subgraph Public["policy_in: DROP, policy_out: ACCEPT"]
            LXC109["LXC 109 website<br/>IN: 80, 443<br/>Outbound: open (npm, git, tunnel)"]
            LXC108["LXC 108 ci<br/>IN: 5000 from dc/registry-clients<br/>Outbound: open (GitHub, tunnel)"]
        end

        subgraph Locked["policy_in: DROP, policy_out: ACCEPT, no DNS"]
            LXC105["LXC 105 db-prod<br/>IN: 5432 from dc/db-prod-clients<br/>No internet"]
            LXC106["LXC 106 db-test<br/>IN: 5432 from dc/db-test-clients<br/>No internet"]
        end

        subgraph Secrets["policy_in: DROP, policy_out: ACCEPT"]
            LXC107["LXC 107 infisical<br/>IN: 8080 from dc/infisical-clients<br/>Outbound: tunnel only"]
        end
    end

    Internet -->|HTTPS| Edge
    Edge -->|tunnel| LXC109
    Access -->|SSO gate| LXC107

    LXC109 -->|5432 allowed| LXC105
    LXC109 -->|5432 allowed| LXC106
    LXC108 -->|8080 allowed| LXC107
    LXC108 -->|5432 allowed| LXC105
    LXC108 -->|5432 allowed| LXC106

    style LXC105 fill:#c44,stroke:#333,color:#fff
    style LXC106 fill:#c44,stroke:#333,color:#fff
    style LXC107 fill:#cc4,stroke:#333
```

**Firewall IP Sets (Datacenter level):**

| IP Set | Members | Controls access to |
|---|---|---|
| `db-prod-clients` | LXC 109, LXC 108, Dev PC | PostgreSQL prod |
| `db-test-clients` | LXC 109, LXC 108, Dev PC | PostgreSQL test |
| `infisical-clients` | LXC 109, LXC 108, Dev PC | Infisical API |
| `registry-clients` | LXC 109 | Docker Registry |

**Security layers:**
1. **Cloudflare** — TLS termination, DDoS, WAF, CDN. No ports open on the homelab.
2. **Cloudflare Access** — SSO gate (Auth0) for private services like Infisical UI.
3. **Proxmox Firewall** — Per-LXC inbound DROP with explicit allow rules via IP sets.
4. **Network isolation** — Database LXCs have no DNS and no internet. Cannot initiate outbound connections.
5. **Auth0 JWT** — API endpoints require valid tokens for write operations.
6. **Infisical** — Secrets never stored in files or environment variables in repos.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Repository Structure

```
www.evanbecker.net/
│
├── evanbecker-client/              # Next.js frontend
│   ├── src/
│   │   ├── app/                    # Pages (App Router)
│   │   │   ├── articles/           # MDX blog articles
│   │   │   ├── about-me/           # About page
│   │   │   ├── contact/            # Contact form
│   │   │   ├── projects/           # Projects showcase
│   │   │   └── feed.xml/           # RSS feed generation
│   │   ├── components/             # Shared React components
│   │   ├── hooks/                  # Custom React hooks
│   │   └── images/                 # Static assets
│   ├── Dockerfile
│   └── package.json
│
├── evanbecker-api/                 # .NET backend
│   ├── evanbecker-api/             # API project
│   │   ├── Controllers/            # REST endpoints
│   │   ├── Services/               # Business logic
│   │   ├── Configuration/          # Auth0, GitHub config
│   │   ├── Dto/                    # Data transfer objects
│   │   └── Program.cs              # Startup & DI
│   └── evanbecker-domain/          # Data layer
│       ├── Entities/               # EF Core models
│       ├── Migrations/             # Database migrations
│       └── ApplicationContext.cs    # DbContext
│
├── docs/guides/                    # Proxmox homelab setup
│   ├── database-lxc-setup.md       # LXC 105/106 — PostgreSQL
│   ├── infisical-lxc-setup.md      # LXC 107 — Secrets management
│   ├── website-lxc-setup.md        # LXC 109 — Traefik + app stack
│   ├── ci-lxc-setup.md             # LXC 108 — Docker Registry + GitHub Actions Runner
│   └── scripts/                    # One-shot install scripts
│       ├── setup-db-prod.sh
│       ├── setup-db-test.sh
│       ├── setup-infisical.sh
│       ├── setup-website.sh
│       └── setup-ci.sh
│
├── deploy/                         # Docker Compose configs (legacy DO)
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.yaml             # Local development
└── CLAUDE.md                       # Development guide
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for frontend-only dev)
- [.NET 10 SDK](https://dotnet.microsoft.com/download) (for API-only dev)

### Quick Start (Full Stack)

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Evanflow-Studio/www.evanbecker.net.git
   cd www.evanbecker.net
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   cp evanbecker-client/.env.example evanbecker-client/.env.local
   ```
   Fill in your Auth0 credentials, database credentials, and API URLs.

3. **Start all services:**
   ```bash
   docker compose up --build
   ```

4. **Open in your browser:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API + Swagger: [http://localhost:5002/swagger](http://localhost:5002/swagger)
   - Traefik Dashboard: [http://localhost:6969](http://localhost:6969)

### Frontend Only

```bash
cd evanbecker-client
npm install
npm run dev
```

### API Only

```bash
cd evanbecker-api/evanbecker-api
dotnet run
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## API Reference

Base path: `/api/v1/`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `comment/{targetLocation}` | GET | No | Get comments for a page |
| `comment/{targetLocation}` | POST | Required | Post a new comment |
| `comment/{targetLocation}/reply/{commentId}` | POST | Required | Reply to a comment |
| `comment/{id}` | DELETE | Required | Soft-delete a comment |
| `contact` | POST | No | Submit a contact message |
| `newsletter` | POST | No | Subscribe to newsletter |
| `user` | GET | Required | Get authenticated user info |

Full interactive docs available via Swagger at `/swagger` on any running API instance.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Deployment

### Branch Strategy

| Branch | Deploys To | URL |
|---|---|---|
| `main` | Test environment | https://test.evanbecker.net |
| `release` | Production | https://www.evanbecker.net |

### Infrastructure

See [Architecture](#architecture) for full diagrams. Setup guides and one-shot install scripts are in [`docs/guides/`](docs/guides/). Architectural decisions are documented in [`docs/adr/`](docs/adr/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Features

- **Blog** — MDX-powered articles with syntax-highlighted code blocks and GitHub-flavored markdown
- **Commenting System** — Auth0-authenticated comments with nested replies on articles
- **Contact Form** — Submissions stored in PostgreSQL
- **Newsletter** — Email subscription signup
- **Projects Showcase** — Portfolio of work
- **Dark/Light Mode** — Theme toggle via next-themes
- **RSS Feed** — Auto-generated at `/feed.xml`
- **Responsive Design** — Tailwind CSS with mobile-first approach
- **Self-Hosted Infrastructure** — No cloud dependencies beyond DNS and auth

---

## Contact

**Evan Becker**

- [LinkedIn](https://www.linkedin.com/in/evanbeckerdotnet/)
- [Website](https://www.evanbecker.net)
- [Email](mailto:me@evanbecker.net)

Project Link: [https://github.com/Evanflow-Studio/www.evanbecker.net](https://github.com/Evanflow-Studio/www.evanbecker.net)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- Badge references -->
[issues-shield]: https://img.shields.io/github/issues/Evanflow-Studio/www.evanbecker.net.svg?style=for-the-badge
[issues-url]: https://github.com/Evanflow-Studio/www.evanbecker.net/issues
[stars-shield]: https://img.shields.io/github/stars/Evanflow-Studio/www.evanbecker.net.svg?style=for-the-badge
[stars-url]: https://github.com/Evanflow-Studio/www.evanbecker.net/stargazers
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/evanbeckerdotnet/

<!-- Tech badges -->
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[Dotnet]: https://img.shields.io/badge/.NET-5C2D91?style=for-the-badge&logo=.net&logoColor=white
[Dotnet-url]: https://dotnet.microsoft.com/
[Postgres]: https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white
[Postgres-url]: https://www.postgresql.org/
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[GitHub]: https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white
[GitHub-url]: https://github.com/features/actions
[Proxmox]: https://img.shields.io/badge/Proxmox-E57000?style=for-the-badge&logo=proxmox&logoColor=white
[Proxmox-url]: https://www.proxmox.com/
[Cloudflare]: https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white
[Cloudflare-url]: https://www.cloudflare.com/
