---
id: ebn.pages
kind: goal
title: Every page is easy to reach and honest about the site
summary: The header, footer, themes, the not-found page and the privacy policy.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.account, ebn.articles]
---

The pages every visitor passes through, and the policy page that says what the site keeps.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.pages.header` | behaviour | Every page's header links Home, About Me, Articles, Sandbox and Contact | none |
| `ebn.pages.signed-in-header` | behaviour | When a visitor is signed in, the header shows their avatar or initials and links to `/account` | none |
| `ebn.pages.footer` | behaviour | The footer links the privacy policy and Evan's GitHub, GitLab and LinkedIn | none |
| `ebn.pages.themes` | look | The site has a light and a dark theme, switched from the header, and the choice is remembered on the next visit | none |
| `ebn.pages.not-found` | behaviour | A path that matches no page shows the site's own "Page not found" page | none |
| `ebn.pages.privacy` | docs | `/privacy-policy` says accurately what the site stores, where that data lives, which third parties see it, and how to have it deleted | none |
| `ebn.pages.no-tracking` | policy | The site runs no analytics, tag managers or third-party tracking scripts | none |
