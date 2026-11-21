---
id: ebn.seo
kind: goal
title: Prod is found by search engines, and test never is
summary: Canonical URLs, robots.txt, noindex on test, the sitemap and article metadata.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.articles, ebn.hosting]
---

What search engines and link previews see. Each environment's public values are in `evanbecker-client/env/*.env`.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.seo.canonical` | behaviour | Every page's canonical URL and the page payload's site URL are the environment's own site URL | `scripts/smoke-client-image.sh` |
| `ebn.seo.prod-indexed` | behaviour | Prod allows crawling: its robots.txt points at its sitemap, and no page carries noindex | `scripts/smoke-client-image.sh` |
| `ebn.seo.test-hidden` | behaviour | Test is never indexed: its robots.txt disallows everything, and every page carries noindex, nofollow | `scripts/smoke-client-image.sh` |
| `ebn.seo.sitemap` | behaviour | `/sitemap.xml` lists the site's pages and articles, every one under the environment's own URL | `scripts/smoke-client-image.sh` |
| `ebn.seo.no-localhost` | behaviour | No page, robots.txt, sitemap or feed served by a deployed environment names localhost | `scripts/smoke-client-image.sh` |
| `ebn.seo.safe-default` | behaviour | Without its environment's values, the client serves localhost URLs and noindex, so a misconfigured deploy is never indexed | none |
| `ebn.seo.article-meta` | behaviour | Each article sets its own description, Open Graph image and article tags for link previews | none |
