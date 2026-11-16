#!/usr/bin/env bash
# Proves the API image's migration modes against a throwaway Postgres 18:
#   1. --migrate-only applies every migration and exits 0; a second run changes nothing.
#   2. --migrate-only exits non-zero when it can't reach the database, without printing
#      the connection string's password.
#   3. Database__MigrateOnStartup=false: the API starts, is healthy, and leaves an empty
#      database empty.
#   4. Unset (the homelab's deploy): the API migrates at startup, as before.
#
#   scripts/smoke-api-migrations.sh <api-image>
#
# Needs only docker. Containers talk over a private network, and checks run through
# docker exec, so it also works on a CI runner that shares the host's Docker socket.
# The database password is a throwaway for this script's own container.
set -euo pipefail

image="${1:?usage: smoke-api-migrations.sh <api-image>}"
run="ebn-smoke-$$"
net="$run-net"
db="$run-db"
dbpass="smoke-only-$$"
started=()

cleanup() {
  [[ ${#started[@]} -gt 0 ]] && docker rm -f -v "${started[@]}" >/dev/null 2>&1 || true
  docker network rm "$net" >/dev/null 2>&1 || true
}
trap cleanup EXIT

failures=0
fail() { echo "  FAIL: $*"; failures=$((failures + 1)); }
pass() { echo "  ok:   $*"; }

psql_q() { docker exec "$db" psql -U ebn -d "$1" -tAc "$2"; }
history_rows() { psql_q "$1" "SELECT count(*) FROM \"__EFMigrationsHistory\"" 2>/dev/null || echo "none"; }
conn() { echo "Host=$db;Port=5432;Database=$1;Username=ebn;Password=$dbpass"; }

docker network create "$net" >/dev/null
docker run -d --name "$db" --network "$net" -e POSTGRES_USER=ebn -e POSTGRES_PASSWORD="$dbpass" -e POSTGRES_DB=ebn postgres:18 >/dev/null
started+=("$db")
for _ in $(seq 1 60); do
  docker exec "$db" pg_isready -U ebn -d ebn >/dev/null 2>&1 && psql_q ebn "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done
for name in startup_off startup_default; do psql_q ebn "CREATE DATABASE $name" >/dev/null; done

echo "== --migrate-only"
if out=$(docker run --rm --network "$net" -e ASPNETCORE_ENVIRONMENT=Test -e "ConnectionStrings__Database=$(conn ebn)" "$image" --migrate-only 2>&1); then
  pass "exit 0: $(grep -m1 'migrate-only: applying' <<<"$out" | cut -c1-80)"
else
  fail "exit non-zero"; echo "$out" | tail -n 15
fi
first=$(history_rows ebn)
[[ "$first" =~ ^[1-9][0-9]*$ ]] && pass "$first migrations recorded" || fail "no migrations recorded ($first)"
if out=$(docker run --rm --network "$net" -e ASPNETCORE_ENVIRONMENT=Test -e "ConnectionStrings__Database=$(conn ebn)" "$image" --migrate-only 2>&1); then
  grep -q "up to date" <<<"$out" && [[ "$(history_rows ebn)" == "$first" ]] && pass "second run: up to date, nothing changed" || fail "second run changed something"
else
  fail "second run exited non-zero"
fi

echo "== --migrate-only, database unreachable"
if out=$(docker run --rm --network "$net" -e ASPNETCORE_ENVIRONMENT=Test -e "ConnectionStrings__Database=Host=nowhere.invalid;Database=ebn;Username=ebn;Password=$dbpass;Timeout=3" "$image" --migrate-only 2>&1); then
  fail "exit 0 without a database"
else
  pass "exit non-zero"
fi
grep -qF "$dbpass" <<<"$out" && fail "the output printed the password" || pass "the password isn't in the output"

start_api() { # name, database, extra docker args...
  local name="$run-$1" database="$2"; shift 2
  docker run -d --name "$name" --network "$net" -e ASPNETCORE_ENVIRONMENT=Test -e ASPNETCORE_URLS=http://+:80 \
    -e "ConnectionStrings__Database=$(conn "$database")" "$@" "$image" >/dev/null
  started+=("$name")
  for _ in $(seq 1 60); do
    docker exec "$name" wget -q -O /dev/null http://127.0.0.1:80/health >/dev/null 2>&1 && return 0
    [[ "$(docker inspect -f '{{.State.Running}}' "$name")" == "true" ]] || break
    sleep 1
  done
  docker logs "$name" 2>&1 | tail -n 15
  return 1
}

echo "== Database__MigrateOnStartup=false"
if start_api off startup_off -e Database__MigrateOnStartup=false; then
  pass "healthy"
  [[ "$(history_rows startup_off)" == "none" ]] && pass "didn't migrate the empty database" || fail "migrated at startup anyway"
else
  fail "didn't become healthy"
fi

echo "== unset (the homelab's deploy)"
if start_api default startup_default; then
  pass "healthy"
  [[ "$(history_rows startup_default)" == "$first" ]] && pass "migrated at startup ($first migrations)" || fail "didn't migrate at startup ($(history_rows startup_default))"
else
  fail "didn't become healthy"
fi

if [[ $failures -gt 0 ]]; then
  echo "smoke-api-migrations: $failures check(s) failed" >&2
  exit 1
fi
echo "smoke-api-migrations: every check passed for $image"
