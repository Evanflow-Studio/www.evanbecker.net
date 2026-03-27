<a name="readme-top"></a>

# www.evanbecker.net

[![Stars][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<br />
<div align="center">
  <a href="https://www.evanbecker.net">
    <img src="evanbecker-client/assets/images/logos/evanbecker-icon.svg" alt="Logo" width="120" height="120">
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
    <a href="https://health.evanbecker.net/status/main">Status</a>
  </p>
</div>

---

## About

This is the monorepo powering [evanbecker.net](https://www.evanbecker.net) — a personal site with blog articles (written in Markdown), an authenticated commenting system, a contact form, newsletter signup, and a projects showcase. The frontend is a Nuxt 3 application and the backend is a .NET API backed by PostgreSQL.

The entire stack is self-hosted on a Proxmox VE homelab with isolated LXC containers, Cloudflare Tunnel for zero-open-port ingress, and Infisical for secrets management.

## Built With

* [![Nuxt][Nuxt.js]][Nuxt-url]
* [![Vue][Vue.js]][Vue-url]
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

### Application Flow

```mermaid
graph LR
    User((User)) -->|browser| CF[Cloudflare Edge<br/>TLS + CDN]
    CF -->|www / test| Client[Nuxt 3<br/>Frontend]
    CF -->|api / api-test| API[.NET API]
    Client -->|fetch| API
    API -->|read/write| DB[(PostgreSQL)]
    User -->|Auth0 login| Auth0[Auth0<br/>Identity Provider]
    Auth0 -->|JWT token| Client
    Client -->|JWT in header| API
```

### Service Topology

```mermaid
graph TB
    subgraph LXC109["LXC 109 — Website (192.168.0.169)"]
        direction TB
        Traefik[Traefik<br/>Reverse Proxy]
        APIProd[API Prod<br/>.NET 10]
        APITest[API Test<br/>.NET 10]
        ClientProd[Client Prod<br/>Nuxt 3]
        ClientTest[Client Test<br/>Nuxt 3]
        Kuma[Uptime Kuma<br/>Monitoring]
        Watchtower[Watchtower<br/>Auto-deploy]
        CFD109[cloudflared<br/>Tunnel]

        Traefik --> APIProd
        Traefik --> APITest
        Traefik --> ClientProd
        Traefik --> ClientTest
        Traefik --> Kuma
    end

    subgraph LXC107["LXC 107 — Infisical (192.168.0.107)"]
        Infisical[Infisical<br/>Secrets API]
    end

    subgraph LXC108["LXC 108 — CI (192.168.0.168)"]
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
    APIProd -->|pull secrets| Infisical
    APITest -->|pull secrets| Infisical
    Runner -->|push image| Registry
    Watchtower -->|pull image| Registry
```

### Deployment Pipeline

```mermaid
graph LR
    Dev[Developer] -->|git push| GH[GitHub]
    GH -->|webhook| Runner[Self-hosted Runner<br/>LXC 108]
    Runner -->|build + push| Registry[Registry<br/>LXC 108:5000]
    Watchtower[Watchtower<br/>LXC 109] -->|detect new image| Registry
    Watchtower -->|pull + restart| Containers[App Containers<br/>LXC 109]
    Containers -->|startup| Infisical[Pull secrets<br/>from Infisical]
    Containers -->|startup| Migrate[Run EF Core<br/>migrations]

    style Runner fill:#f9f,stroke:#333
    style Watchtower fill:#9f9,stroke:#333
```

| Branch | Deploys To | Image Tag | URL |
|--------|-----------|-----------|-----|
| `develop` | Test | `:test` | test.evanbecker.net / api-test.evanbecker.net |
| `main` | Production | `:latest` | www.evanbecker.net / api.evanbecker.net |

No secrets in CI. The API pulls all secrets from Infisical at startup. Migrations run automatically at container startup.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Repository Structure

```
www.evanbecker.net/
│
├── evanbecker-client/              # Nuxt 3 frontend → see evanbecker-client/README.md
├── evanbecker-api/                 # .NET backend   → see evanbecker-api/README.md
├── infrastructure/                 # Homelab infra  → see infrastructure/README.md
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.yaml             # Local development
└── docker-compose.production.yaml  # Production (LXC 109)
```

Each sub-project has its own README with detailed structure, setup, and configuration:

- **[`evanbecker-client/README.md`](evanbecker-client/README.md)** — Frontend development, demos, environment variables
- **[`evanbecker-api/README.md`](evanbecker-api/README.md)** — API endpoints, secrets architecture, database setup
- **[`infrastructure/README.md`](infrastructure/README.md)** — LXC containers, deployment, security

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for frontend-only dev)
- [.NET 10 SDK](https://dotnet.microsoft.com/download) (for API-only dev)

### Quick Start (Recommended)

Start PostgreSQL, then run the frontend and API natively for hot-reload:

```bash
# 1. Clone the repo
git clone https://github.com/Evanflow-Studio/www.evanbecker.net.git
cd www.evanbecker.net

# 2. Start just the database
docker compose up -d

# 3. Run the API (in one terminal)
cd evanbecker-api/evanbecker-api
dotnet run

# 4. Run the frontend (in another terminal)
cd evanbecker-client
npm install
npm run dev
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API + Swagger:** [http://localhost:5002/swagger](http://localhost:5002/swagger)
- **PostgreSQL:** `localhost:5432` (user: `EvanBecker`, password: `P@55W0RD123`, db: `evanbecker-db`)

The database credentials are hardcoded in `docker-compose.yaml` and match `appsettings.Development.json`. No `.env` file needed for the database.

For API secrets (Auth0, Spotify, etc.), use .NET User Secrets — see [`evanbecker-api/README.md`](evanbecker-api/README.md#local-development-secrets) for setup.

### Full Stack in Docker (Optional)

Runs everything in containers — useful for testing the production-like setup:

```bash
docker compose --profile fullstack up --build
```

### Database Migrations

Migrations auto-apply when the API runs in Docker (`/app` working directory). For local development, apply manually:

```bash
cd evanbecker-api/evanbecker-domain
dotnet ef database update --startup-project ../evanbecker-api
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## API Reference

See [`evanbecker-api/README.md`](evanbecker-api/README.md) for full endpoint documentation, secrets architecture, and database setup. Interactive Swagger docs available at `/swagger` on any running API instance.

## Deployment

See [`infrastructure/README.md`](infrastructure/README.md) for full deployment documentation including LXC container setup, CI/CD pipeline, secrets management, monitoring, and security.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Features

- **Blog** — Markdown-powered articles with syntax-highlighted code blocks via Nuxt Content
- **Commenting System** — Auth0-authenticated comments with nested replies on articles
- **Contact Form** — Submissions stored in PostgreSQL
- **Newsletter** — Email subscription signup
- **Projects Showcase** — Portfolio of work
- **Dark/Light Mode** — Theme toggle via @nuxtjs/color-mode
- **RSS Feed** — Auto-generated at `/feed.xml`
- **Responsive Design** — Tailwind CSS with mobile-first approach
- **Self-Hosted Infrastructure** — No cloud dependencies beyond DNS and auth
- **Status Page** — Public uptime monitoring at [health.evanbecker.net](https://health.evanbecker.net/status/main)

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
[Nuxt.js]: https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white
[Nuxt-url]: https://nuxt.com/
[Vue.js]: https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white
[Vue-url]: https://vuejs.org/
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
