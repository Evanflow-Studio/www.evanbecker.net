---
id: ebn
kind: goal
title: www.evanbecker.net works the way Evan wants it
summary: Evan's public site and blog, described as desired-state statements that each name their check.
parent: product.www-evanbecker-net
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [org.goal.website-on-digitalocean]
---

The website's desired state: what Evan wants true of the site, in the org's format (hq `docs/knowledge.md`,
sections 2 to 5). Current state isn't written here. It's observed from the code, the tests, CI and the running site.

**The format.** One page per area, each with a metadata block, then a table of statements. A row is one statement:

| Column | Holds |
|---|---|
| Key | The statement's `id`. Its `parent` is the page's `id`; its `product`, `owner` and `status` are the page's. |
| Kind | The statement kind from hq `docs/knowledge.md` section 3 (`behaviour`, `look`, `experience`, `ility`, `architecture`, `infrastructure`, `cost`, `policy`, `decision`, `docs`) |
| Statement | The statement itself, one line. It doubles as `title` and `summary`. |
| Check | The test, script or CI job that proves it, named exactly, or `none` |

Test names are written as `Class.Method` for the API's xunit tests, `file › describe › it` for the client's vitest
tests, a script's path for the smoke scripts, and `workflow › job` for a CI job. Everything here is `draft` until Evan
agrees it, except [comments.md](comments.md), which is `superseded`: kept as it was, never deleted.

**Ideas stay out.** Possible features and candidate bugs are in [ideas.md](ideas.md). They link to these pages but
never drive a decision.

| Page | Area |
|---|---|
| [pages.md](pages.md) | Pages, navigation and the privacy policy |
| [articles.md](articles.md) | The blog and its articles |
| [account.md](account.md) | Sign-in, the profile and the Notifications preference |
| [comments.md](comments.md) | Comments on articles, superseded on 2026-11-17: the site has none |
| [contact.md](contact.md) | Contact mail, reCAPTCHA and the newsletter sign-up |
| [sandbox.md](sandbox.md) | The ray marcher and the homelab demo |
| [seo.md](seo.md) | Canonical URLs, indexing, the sitemap and the feed |
| [hosting.md](hosting.md) | Images, environments, secrets and migrations |
| [security.md](security.md) | The public repo's security policy, and no personal data out of the API |
