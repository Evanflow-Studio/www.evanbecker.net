#!/usr/bin/env bash
# Runs a command with every enabled secret in an Azure Key Vault as an environment
# variable of that process only. Nothing is written to disk.
# Secret names use Section--Key; they become Section__Key, which .NET binds to Section:Key.
#
#   scripts/run-with-keyvault.sh <vault> [-- command args...]
#
# With no command it runs the API. Needs `az login` and Key Vault Secrets User (or
# Officer) on the vault. Prints secret names, never values.
set -euo pipefail

vault="${1:?usage: run-with-keyvault.sh <vault> [-- command args...]}"
shift
[[ "${1:-}" == "--" ]] && shift
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ $# -eq 0 ]]; then
  set -- dotnet run --project "$root/evanbecker-api/evanbecker-api"
fi

names=$(az keyvault secret list --vault-name "$vault" --query "[?attributes.enabled].name" -o tsv | tr -d '\r')
loaded=()
for name in $names; do
  var="${name//--/__}"
  if [[ ! "$var" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "run-with-keyvault: skipping '$name' (not a valid environment variable name)" >&2
    continue
  fi
  value=$(az keyvault secret show --vault-name "$vault" --name "$name" --query value -o tsv | tr -d '\r')
  export "$var=$value"
  loaded+=("$var")
done
unset value

# Make sure the old Infisical path can't kick in alongside the vault values.
unset INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET INFISICAL_ADDRESS INFISICAL_PROJECT_ID INFISICAL_ENVIRONMENT

echo "run-with-keyvault: ${#loaded[@]} secrets from $vault: ${loaded[*]:-none}" >&2
exec "$@"
