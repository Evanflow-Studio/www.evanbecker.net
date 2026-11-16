#!/usr/bin/env bash
# Proves one client image serves every environment: runs <image> once per env file
# (evanbecker-client/env/test.env and prod.env by default) and checks that the home page,
# robots.txt, sitemap.xml and feed.xml each use that environment's own site URL, and that
# only an indexable environment invites crawlers. It also sets NUXT_API_BASE_SERVER, the
# server-only API address, and checks the browser never sees it.
#
#   scripts/smoke-client-image.sh <image> [env-file...]
#
# Needs only docker: it publishes no ports and fetches each page from inside the container
# (busybox wget in the alpine image), so it works the same on a laptop and on a CI runner
# that shares the host's Docker socket. Stops its containers on exit.
set -euo pipefail

image="${1:?usage: smoke-client-image.sh <image> [env-file...]}"
shift
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ $# -eq 0 ]]; then
  set -- "$root/evanbecker-client/env/test.env" "$root/evanbecker-client/env/prod.env"
fi

containers=()
cleanup() { [[ ${#containers[@]} -gt 0 ]] && docker rm -f "${containers[@]}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

failures=0
fail() { echo "  FAIL: $*"; failures=$((failures + 1)); }
pass() { echo "  ok:   $*"; }

# Reads one KEY=value from an env file (no quoting, as docker --env-file has none).
env_value() { sed -n "s/^$2=//p" "$1" | tr -d '\r' | tail -n 1; }

for env_file in "$@"; do
  name="$(basename "$env_file" .env)"
  site_url="$(env_value "$env_file" NUXT_PUBLIC_SITE_URL)"
  site_url="${site_url%/}"
  indexable="$(env_value "$env_file" NUXT_PUBLIC_INDEXABLE)"
  [[ -n "$site_url" ]] || { echo "$env_file sets no NUXT_PUBLIC_SITE_URL" >&2; exit 2; }

  container="ebn-smoke-$name-$$"
  internal="http://ebn-smoke-internal-api.invalid/"
  docker run -d --rm --name "$container" --env-file "$env_file" -e NUXT_API_BASE_SERVER="$internal" "$image" >/dev/null
  containers+=("$container")
  fetch() { docker exec "$container" wget -q -O - "http://127.0.0.1:3000$1"; }

  echo "== $name ($site_url, indexable=${indexable:-unset})"
  for _ in $(seq 1 60); do
    fetch /robots.txt >/dev/null 2>&1 && break
    sleep 1
  done

  home="$(fetch /)" || { fail "home page didn't load"; docker logs "$container" | tail -n 20; continue; }
  robots="$(fetch /robots.txt)"
  sitemap="$(fetch /sitemap.xml)"
  feed="$(fetch /feed.xml)"

  grep -qF "<link rel=\"canonical\" href=\"$site_url\"" <<<"$home" && pass "canonical is $site_url" || fail "canonical isn't $site_url"
  grep -qF "siteUrl:\"$site_url\"" <<<"$home" && pass "payload siteUrl is $site_url" || fail "payload siteUrl isn't $site_url"
  api_url="$(env_value "$env_file" NUXT_PUBLIC_API_URL)"
  grep -qF "apiUrl:\"$api_url\"" <<<"$home" && pass "payload apiUrl is $api_url" || fail "payload apiUrl isn't $api_url"

  locs="$(grep -oE '<loc>[^<]+</loc>' <<<"$sitemap" | sed -E 's#</?loc>##g')"
  if [[ -z "$locs" ]]; then
    fail "sitemap.xml lists no URLs"
  elif grep -vqF "$site_url/" <<<"$locs"; then
    fail "sitemap.xml has URLs outside $site_url: $(grep -vF "$site_url/" <<<"$locs" | head -n 3 | tr '\n' ' ')"
  else
    pass "sitemap.xml: $(wc -l <<<"$locs" | tr -d ' ') URLs, all under $site_url"
  fi

  grep -qF "<link>$site_url</link>" <<<"$feed" && pass "feed.xml links $site_url" || fail "feed.xml doesn't link $site_url"

  for body in "$home" "$robots" "$sitemap" "$feed"; do
    if grep -qE 'https?://(localhost|127\.0\.0\.1)' <<<"$body"; then fail "a response still names localhost"; break; fi
  done
  grep -qF "ebn-smoke-internal-api" <<<"$home$robots$sitemap$feed" && fail "the server-only API address reached the browser" || pass "the server-only API address stays on the server"

  if [[ "$indexable" == "true" ]]; then
    grep -qF "Sitemap: $site_url/sitemap.xml" <<<"$robots" && pass "robots.txt allows crawling, sitemap $site_url/sitemap.xml" || fail "robots.txt doesn't point at $site_url/sitemap.xml"
    grep -qF 'name="robots" content="noindex' <<<"$home" && fail "an indexable site serves noindex" || pass "no noindex meta"
  else
    grep -qx 'Disallow: /' <<<"$robots" && pass "robots.txt disallows everything" || fail "robots.txt doesn't disallow everything"
    grep -qF 'name="robots" content="noindex, nofollow"' <<<"$home" && pass "noindex meta present" || fail "noindex meta missing"
  fi
done

if [[ $failures -gt 0 ]]; then
  echo "smoke-client-image: $failures check(s) failed" >&2
  exit 1
fi
echo "smoke-client-image: every check passed for $image"
