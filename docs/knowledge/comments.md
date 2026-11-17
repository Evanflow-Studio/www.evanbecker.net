---
id: ebn.comments
kind: goal
title: Readers can discuss an article, live
summary: Who can read, post, reply and delete comments, and how they arrive without a reload.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.articles, ebn.account]
---

Comments on articles: `/api/v1/comment` and the comments hub at `/hubs/comments`.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.comments.read` | behaviour | Anyone can read an article's comments and replies without signing in | none |
| `ebn.comments.post` | behaviour | Only a signed-in visitor can post a comment or reply to one | none |
| `ebn.comments.live` | behaviour | A new comment or reply appears for everyone reading that article, without a reload | none |
| `ebn.comments.delete` | behaviour | An author can delete their own comments and replies, and an admin or the owner can delete any; a deleted one is hidden from every reader and kept in the database | none |
| `ebn.comments.hub-credentials` | infrastructure | The comments hub connects with credentials, so it works behind Cloudflare Access on test | `apiBase.test.ts › every call site › opens every SignalR hub with credentials` |
| `ebn.comments.no-settings` | policy | A comment's payload never carries its author's newsletter opt-in | `UserSettingsTests.Comment_payloads_never_carry_the_opt_in` † |
| `ebn.comments.public-authors` | policy | Every comment response and broadcast shows an author by name and avatar only, and marks for the reader which comments they may delete | `CommentPayloadTests.The_comments_list_shows_authors_by_name_and_avatar_only` ‡, `CommentPayloadTests.A_new_comment_shows_its_author_by_name_and_avatar_only_in_the_response_and_the_broadcast` ‡, `CommentPayloadTests.A_signed_in_reader_can_delete_their_own_and_nobody_elses` ‡ |

† On the branch `account/notifications-and-names`, not merged yet. ‡ On the branch `fix/public-api-exposures`, not merged yet.
