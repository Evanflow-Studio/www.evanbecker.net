---
id: ebn.contact
kind: goal
title: Visitors can reach Evan, and spam can't
summary: The contact form, its reCAPTCHA check, contact mail, and the newsletter sign-up.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.security, ebn.hosting]
---

The contact form (`/contact`, `/api/v1/contact`) and the newsletter sign-up (`/api/v1/newsletter`). ‡ marks a test on the branch `fix/public-api-exposures`, not merged yet.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.contact.form` | behaviour | `/contact` takes a first name, last name, email, phone number and message | none |
| `ebn.contact.recaptcha` | behaviour | The form sends a reCAPTCHA v3 token for the action `contact`, and the API refuses the message when verification fails or scores under 0.5 | none |
| `ebn.contact.mail` | behaviour | An accepted message is saved and emailed to Evan's contact address | none |
| `ebn.contact.thank-you` | experience | After sending, the visitor lands on `/thank-you-message` | none |
| `ebn.contact.newsletter` | behaviour | The About Me page takes an email for the newsletter; an address already signed up is refused, and Evan is told about each new one | none |
| `ebn.contact.newsletter-protected` | behaviour | The newsletter sign-up is protected like the contact form: it needs a passing reCAPTCHA v3 token, checked first, and one client can sign up at most five addresses an hour | `NewsletterSignUpTests.Refuses_a_sign_up_that_fails_recaptcha` ‡, `NewsletterSignUpTests.Each_client_gets_five_sign_ups_an_hour_then_429s` ‡, `NewsletterSignUpTests.The_sign_up_endpoint_carries_the_newsletter_rate_limit` ‡ |
| `ebn.contact.newsletter-once` | behaviour | An address already signed up, in any case or spacing, is refused, and Evan isn't emailed about it again | `NewsletterSignUpTests.Refuses_an_address_already_signed_up_without_emailing_Evan_again` ‡, `NewsletterSignUpTests.A_sign_up_that_loses_a_race_for_the_same_address_doesnt_email_Evan` ‡ |
| `ebn.contact.keys` | infrastructure | The email and reCAPTCHA keys and the contact address come from each environment's Key Vault (`Email--ApiKey`, `Email--ToAddress`, `Recaptcha--SecretKey`); the API starts without them for local runs | none |
