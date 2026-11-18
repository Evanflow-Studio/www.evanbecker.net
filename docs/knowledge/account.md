---
id: ebn.account
kind: goal
title: Visitors can sign in and look after their own account
summary: Sign-in through Auth0, the first-time profile, the account page, and the Notifications preference.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.comments, ebn.security]
---

Sign-in and the account page. The checks marked with † are on the branch `account/notifications-and-names`, which
isn't merged yet, so they'll read as unknown until it is.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.account.sign-in` | behaviour | A visitor signs in with Auth0 from the header or the account page | none |
| `ebn.account.first-profile` | experience | The first sign-in creates the visitor's account and asks for a first name, and the prompt can't be closed until one is given | none |
| `ebn.account.profile` | behaviour | `/account` lets a signed-in visitor change their first name, last name and avatar, and upload an image or go back to initials | none |
| `ebn.account.names-from-auth0` | behaviour | First and last names come from Auth0's given and family names; an email address is never taken as a name, so with no name both start empty | `auth0Profile.test.ts › namesFromAuth0Profile` †, `UserSettingsTests.Never_takes_an_email_as_a_first_name` † |
| `ebn.account.notifications` | behaviour | The account page's Notifications card has one opt-in, "Email me newsletters and updates", off by default and saved per user | `UserSettingsTests.A_new_user_is_not_opted_in_to_newsletters` †, `UserSettingsTests.Saves_the_newsletter_opt_in_and_returns_it` † |
| `ebn.account.opt-in-kept` | behaviour | Saving the profile never changes the newsletter opt-in | `UserSettingsTests.A_profile_save_leaves_the_opt_in_as_it_was` † |
| `ebn.account.no-sending-yet` | decision | Nothing emails opted-in users yet; the preference is only stored (Evan, 11-17) | none |
| `ebn.account.expired-session` | experience | When a session has expired, the account page says so and offers "Sign in again", without leaving the page | none |
| `ebn.account.auth0-config` | decision | Auth0's domain, audience and client IDs come from each environment's appsettings, never from the secrets store | `AppSettingsTests.Production_uses_the_prod_tenant_and_its_swagger_client`, `AppSettingsTests.Test_uses_the_dev_tenant_and_the_test_client`, `InfisicalSecretsMapperTests.Ignores_auth0_keys` |
| `ebn.account.shared-tenant` | decision | Nothing in the site stops the Evanflow site from using the same Auth0 tenant with an Auth0 Organization of its own (Evan, 11-17) | none |
