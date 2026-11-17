---
id: ebn.security
kind: goal
title: The public repo leaks nothing, and the site fails safe
summary: No secrets or internal details in the repo, no personal data out of the API, safe configuration, our own runner, and the API's origins.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.hosting, ebn.account]
---

The site's security policy. The repo is public, so the policy covers what's written in it as much as what runs. The
checks marked with ‡ are on the branch `fix/public-api-exposures`, which isn't merged yet.

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.security.no-secrets` | policy | No secret value is in the repo; gitleaks allows exactly three public values and nothing else | `dotnet-pull_request.yml › gitleaks` |
| `ebn.security.no-internal` | policy | The repo holds nothing internal that isn't already public: no new homelab IPs, guest numbers or hostnames | none |
| `ebn.security.no-personal-data` | policy | No public endpoint returns personal data | `AnonymousGetTests.No_GET_anyone_can_call_returns_personal_data` ‡, `AnonymousGetTests.Every_GET_that_needs_sign_in_refuses_an_anonymous_caller` ‡, `PersonalDataGuardTests.No_response_carries_an_entity_or_personal_data` ‡, `PersonalDataGuardTests.Personal_data_is_excused_only_where_the_caller_must_sign_in` ‡ |
| `ebn.security.readable-responses` | architecture | No endpoint returns an entity, and every endpoint's response can be read from its declared types; each exception is in the guard's allowlist with its reason, and one that no longer applies fails | `PersonalDataGuardTests.Every_endpoint_declares_what_it_returns` ‡, `PersonalDataGuardTests.No_response_carries_an_entity_or_personal_data` ‡, `PersonalDataGuardTests.Every_allowance_still_excuses_something` ‡, `PersonalDataGuardTests.The_guard_reads_every_kind_of_endpoint_the_API_maps` ‡ |
| `ebn.security.required-config` | behaviour | The API refuses to start when a required setting is missing, empty or a placeholder, and names the setting | `RequiredConfigurationTests.Fails_naming_the_missing_setting`, `RequiredConfigurationTests.Treats_empty_values_and_placeholders_as_missing`, `RequiredConfigurationTests.Passes_when_every_required_setting_is_present` |
| `ebn.security.never-print-values` | policy | No startup check or migration error prints a setting's value | `RequiredConfigurationTests.Never_prints_a_value`, `DatabaseMigrationsTests.Migrate_only_exits_1_when_the_database_is_unreachable_without_printing_the_connection_string` |
| `ebn.security.no-placeholders` | policy | No settings file holds a `<...>` placeholder or a retired Auth0 key | `AppSettingsTests.Holds_no_placeholder_values`, `AppSettingsTests.Holds_no_retired_auth0_keys` |
| `ebn.security.auth0-no-secret` | policy | The API's Auth0 configuration holds no secret, only public identifiers | `AppSettingsTests.Auth0_configuration_binds_no_secret` |
| `ebn.security.api-url` | architecture | The client reads the public API URL only through `useApiBase` | `apiBase.test.ts › every call site › reads the public API URL only through useApiBase` |
| `ebn.security.own-runner` | policy | Every CI job runs on our own runner, and a pull request from a fork never reaches it: every PR job keeps the same-repository guard | none |
| `ebn.security.origins` | policy | The API accepts browser calls with credentials only from the site's own origins: prod, its apex domain, test, and local development | none |
| `ebn.security.push` | policy | Nothing is pushed without Evan's approval, `develop` changes only through a pull request, and `main` moves only by a pull request from `develop` | none |
