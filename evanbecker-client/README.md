# evanbecker-client

The Next.js frontend for [www.evanbecker.net](https://www.evanbecker.net).

## Tech Stack

- **Next.js 15** with App Router
- **React 19** + TypeScript
- **Tailwind CSS 4.x**
- **MDX** for blog articles (with syntax highlighting via prism-react-renderer)
- **Auth0** for authentication (commenting system)
- **Headless UI** + **Heroicons** for accessible components

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a `.env.local`** (see `.env.example`):
   ```
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:5002
   NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain
   NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
   NEXT_PUBLIC_AUTH0_AUDIENCE=your-audience
   NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000
   ```

3. **Run the dev server:**
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── articles/           # MDX blog articles
│   ├── about-me/           # About page
│   ├── contact/            # Contact form
│   ├── projects/           # Projects showcase
│   ├── feed.xml/           # RSS feed generation
│   ├── layout.tsx          # Root layout (fonts, metadata)
│   ├── page.tsx            # Home page
│   └── providers.tsx       # Auth0Provider wrapper
├── components/             # Shared React components
│   ├── Header.tsx          # Site header/nav
│   ├── Footer.tsx          # Site footer
│   ├── Comment.jsx         # Comment display
│   ├── CommentSection.jsx  # Comment list + form
│   ├── CodeEditor.tsx      # Syntax-highlighted code blocks
│   └── ...
├── hooks/                  # Custom React hooks
├── images/                 # Static images and logos
└── styles/                 # Global CSS
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Writing Articles

Blog articles are MDX files in `src/app/articles/`. Each article is a directory with a `page.mdx` file. MDX supports JSX components inline with markdown and code blocks with syntax highlighting.

## Docker

The Dockerfile uses a multi-stage Node.js 20 Alpine build. In production, the container runs on port 3000 behind Traefik.

```bash
docker build -f Dockerfile -t evanbecker-client .
```

## License

This site template is based on a [Tailwind Plus](https://tailwindcss.com/plus) template, licensed under the Tailwind Plus license.
