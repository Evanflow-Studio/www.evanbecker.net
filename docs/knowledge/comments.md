---
id: ebn.comments
kind: goal
title: Readers can discuss an article, live (superseded)
summary: Comments on articles, as they were until Evan removed them on 2026-11-17. Kept, never deleted.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: superseded
read: public
links: [ebn.articles, ebn.account, ebn.articles.no-comments, ebn.security.no-personal-data]
---

Superseded on 2026-11-17. Evan: "I don't want comments on my site going forward after considering it further, so we
should just remove them." The comment endpoints, the hub at `/hubs/comments` and the comment section are gone, so
nothing here is checked any more; [articles.md](articles.md) says what replaced them (`ebn.articles.no-comments`),
and [security.md](security.md) holds the rule that came out of their payloads (`ebn.security.no-personal-data`).
Every row keeps this page's status. `ebn.articles.comments` moved here from the articles page when it was superseded.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.articles.comments` | behaviour | Each article's page ends with its comment section | none |
| `ebn.comments.read` | behaviour | Anyone can read an article's comments and replies without signing in | none |
| `ebn.comments.post` | behaviour | Only a signed-in visitor can post a comment or reply to one | none |
| `ebn.comments.live` | behaviour | A new comment or reply appears for everyone reading that article, without a reload | none |
| `ebn.comments.delete` | behaviour | An author can delete their own comments and replies, and an admin or the owner can delete any; a deleted one is hidden from every reader and kept in the database | none |
| `ebn.comments.hub-credentials` | infrastructure | The comments hub connects with credentials, so it works behind Cloudflare Access on test | `apiBase.test.ts › every call site › opens every SignalR hub with credentials` |
| `ebn.comments.no-settings` | policy | A comment's payload never carries its author's newsletter opt-in | `UserSettingsTests.Comment_payloads_never_carry_the_opt_in` † |
| `ebn.comments.public-authors` | policy | Every comment response and broadcast shows an author by name and avatar only, and marks for the reader which comments they may delete | `CommentPayloadTests.The_comments_list_shows_authors_by_name_and_avatar_only` ‡, `CommentPayloadTests.A_new_comment_shows_its_author_by_name_and_avatar_only_in_the_response_and_the_broadcast` ‡, `CommentPayloadTests.A_signed_in_reader_can_delete_their_own_and_nobody_elses` ‡ |

The checks named here went with comments: the hub test was replaced, and `CommentPayloadTests` was removed on the
branch `fix/public-api-exposures`. † The opt-in test is on the branch `account/notifications-and-names`.
