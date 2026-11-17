#!/usr/bin/env bash
# Runs the API tests that need a real database (Category=Postgres: the personal-data guard's
# anonymous calls) against a throwaway Postgres 18, the same way on a laptop and on the CI runner:
#
#   scripts/test-api-with-postgres.sh
#
# Needs only docker and git. The tests run in the .NET SDK image, on a private network with the
# database. The source goes in through tar rather than a bind mount: the runner shares the host's
# Docker socket, so a bind mount of $PWD would name a host path that doesn't exist. Only files git
# tracks or would track go in, so bin, obj and local secrets stay out. The database password is a
# throwaway for this script's own container.
set -euo pipefail
cd "$(dirname "$0")/.."

run="ebn-pgtest-$$"
net="$run-net"
db="$run-db"
dbpass="pgtest-only-$$"
sdk="mcr.microsoft.com/dotnet/sdk:10.0-alpine"

cleanup() {
  docker rm -f -v "$db" >/dev/null 2>&1 || true
  docker network rm "$net" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$net" >/dev/null
docker run -d --name "$db" --network "$net" -e POSTGRES_USER=ebn -e POSTGRES_PASSWORD="$dbpass" -e POSTGRES_DB=ebn postgres:18 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$db" pg_isready -U ebn -d ebn >/dev/null 2>&1 && docker exec "$db" psql -U ebn -d ebn -tAc "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done

sources() {
  git ls-files --cached --others --exclude-standard -- evanbecker-api | while IFS= read -r file; do
    [[ -f "$file" ]] && printf '%s\n' "$file"
  done
}

tar -cf - -T <(sources) | docker run --rm -i --network "$net" \
  -e "EBN_GUARD_DATABASE=Host=$db;Port=5432;Database=ebn;Username=ebn;Password=$dbpass" \
  -e DOTNET_CLI_TELEMETRY_OPTOUT=1 -e DOTNET_NOLOGO=1 \
  "$sdk" sh -c '
    set -e
    mkdir -p /src && tar -xf - -C /src
    cd /src/evanbecker-api
    dotnet test evanbecker-api.Tests --filter "Category=Postgres" --logger "console;verbosity=normal"
  '
