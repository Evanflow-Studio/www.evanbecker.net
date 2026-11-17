---
id: ebn.ideas
kind: idea
title: Ideas for www.evanbecker.net
summary: Possible features and improvements, linked to the desired state but never used to decide anything.
parent: ebn
product: www.evanbecker.net
owner: Evan
status: draft
read: public
---

Ideas, kept apart from the desired state on purpose. Each links to the statements it touches, so an agent working
nearby can see it, but none of them drives a decision. An idea becomes desired state only when Evan agrees it and it's
written as a statement with a check.

| Key | Idea | Touches |
|---|---|---|
| `ebn.idea.preview-drafts` | Show articles marked as drafts on test only, so Evan can read a draft on the real site before publishing it | `ebn.articles.drafts`, `ebn.articles.voice` |
| `ebn.idea.newsletter-sending` | Send the newsletter to account holders who opted in, with an unsubscribe link in every email | `ebn.account.notifications`, `ebn.account.no-sending-yet` |
| `ebn.idea.consent-record` | Record when each user opted in or out, so the site can show when consent was given | `ebn.account.notifications` |
| `ebn.idea.one-list` | Decide how the account opt-in and the About Me sign-up list relate: one list, or two with one unsubscribe | `ebn.account.notifications`, `ebn.contact.newsletter` |
| `ebn.idea.live-deletes` | Remove a deleted comment from every open page without a reload, the way new comments arrive. Moot since comments left the site (11-17) | `ebn.comments.live`, `ebn.comments.delete` |
| `ebn.idea.e2e-journeys` | End-to-end tests for the main journeys: sign in and edit the profile, send the contact form, sign up for the newsletter | `ebn.account.profile`, `ebn.contact.mail`, `ebn.contact.newsletter` |
| `ebn.idea.local-without-auth0` | Let the client run locally without Auth0 settings; today every page fails because the API helper reads Auth0 unguarded | `ebn.account.sign-in` |
| `ebn.idea.typecheck-lint` | Get `nuxi typecheck` to zero errors and add a linter, so both can become checks in CI | `ebn.security.api-url` |
| `ebn.idea.homelab-demo` | Redraw the homelab demo for the new layout, where the homelab serves nothing and the site runs on the droplet | `ebn.sandbox.homelab-status`, `ebn.hosting.homelab-serves-nothing` |
| `ebn.idea.testers` | Let chosen Auth0 accounts into test through Cloudflare Access, so testers sign in once for both | `ebn.hosting.test-access`, `ebn.account.shared-tenant` |
| `ebn.idea.cached-copy` | Keep a cached copy of the public pages at Cloudflare's edge, so the articles stay readable if the origin is down | `ebn.articles.page`, `ebn.hosting.droplet` |
| `ebn.idea.squash-migrations` | Squash the migrations into one once the homelab databases retire | `ebn.hosting.expand-contract` |
