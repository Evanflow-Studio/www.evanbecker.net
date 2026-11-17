---
id: ebn.articles
kind: goal
title: Evan's essays are easy to find, read and follow
summary: The articles list, each article's page, related articles, the feed, and how articles are written.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.comments, ebn.seo]
---

The blog: Evan's essays in `evanbecker-client/content/articles/`.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.articles.list` | behaviour | `/articles` lists every published article, newest first, with its date, reading time and tags | none |
| `ebn.articles.featured` | behaviour | An article marked `featured` is shown first on `/articles`, on its own | none |
| `ebn.articles.drafts` | behaviour | An article marked as a draft never appears on the articles list | none |
| `ebn.articles.page` | behaviour | Each article's page shows its title, date, reading time and tags | none |
| `ebn.articles.related` | behaviour | Each article's page lists related articles that share its tags | none |
| `ebn.articles.comments` | behaviour | Each article's page ends with its comment section | none |
| `ebn.articles.diagrams` | look | Mermaid diagrams in an article render in both themes | none |
| `ebn.articles.feed` | behaviour | `/feed.xml` is an RSS feed of the articles, linking the environment's own site URL, and every page advertises it | `scripts/smoke-client-image.sh` |
| `ebn.articles.voice` | policy | Articles are Evan's essays: agents draft them with the blog-voice skill, and nothing is published without Evan's review | none |
| `ebn.articles.record` | decision | A published article stays as the record of what was true when it was written; a changed view gets a dated note, and old infrastructure it mentions (like Infisical) stays as written | none |
