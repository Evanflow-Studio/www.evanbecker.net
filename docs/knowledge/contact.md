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

The contact form (`/contact`, `/api/v1/contact`) and the newsletter sign-up (`/api/v1/newsletter`).

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.contact.form` | behaviour | `/contact` takes a first name, last name, email, phone number and message | none |
| `ebn.contact.recaptcha` | behaviour | The form sends a reCAPTCHA v3 token for the action `contact`, and the API refuses the message when verification fails or scores under 0.5 | none |
| `ebn.contact.mail` | behaviour | An accepted message is saved and emailed to Evan's contact address | none |
| `ebn.contact.thank-you` | experience | After sending, the visitor lands on `/thank-you-message` | none |
| `ebn.contact.newsletter` | behaviour | The About Me page takes an email for the newsletter; an address already signed up is refused, and Evan is told about each new one | none |
| `ebn.contact.keys` | infrastructure | The email and reCAPTCHA keys and the contact address come from each environment's Key Vault (`Email--ApiKey`, `Email--ToAddress`, `Recaptcha--SecretKey`); the API starts without them for local runs | none |
