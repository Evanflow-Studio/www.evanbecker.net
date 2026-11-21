<#
.SYNOPSIS
Runs a command with every enabled secret in an Azure Key Vault as environment variables
of this process and the command, then restores the environment. Nothing is written to disk.

.DESCRIPTION
Secret names use Section--Key; they become Section__Key, which .NET binds to Section:Key.
With no command it runs the API. Needs `az login` and Key Vault Secrets User (or Officer)
on the vault. Prints secret names, never values. Works in Windows PowerShell 5.1 and 7+.

.EXAMPLE
scripts/run-with-keyvault.ps1 ef-ebn-tst-eus2-kv
scripts/run-with-keyvault.ps1 ef-ebn-tst-eus2-kv dotnet test
#>
param(
    [Parameter(Mandatory = $true, Position = 0)] [string] $Vault,
    [Parameter(ValueFromRemainingArguments = $true)] [string[]] $Command
)
$ErrorActionPreference = 'Stop'

if (-not $Command -or $Command.Count -eq 0) {
    $Command = @('dotnet', 'run', '--project', (Join-Path (Split-Path -Parent $PSScriptRoot) 'evanbecker-api/evanbecker-api'))
}

$names = @(az keyvault secret list --vault-name $Vault --query "[?attributes.enabled].name" -o tsv)
if ($LASTEXITCODE -ne 0) { throw "Couldn't list secrets in $Vault (az login? Key Vault Secrets User?)" }

$saved = @{}
$cleared = 'INFISICAL_CLIENT_ID', 'INFISICAL_CLIENT_SECRET', 'INFISICAL_ADDRESS', 'INFISICAL_PROJECT_ID', 'INFISICAL_ENVIRONMENT'
try {
    foreach ($name in $cleared) {
        $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        [Environment]::SetEnvironmentVariable($name, $null, 'Process')
    }
    $loaded = @()
    foreach ($name in $names) {
        $var = $name -replace '--', '__'
        if ($var -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
            Write-Warning "skipping '$name' (not a valid environment variable name)"
            continue
        }
        if (-not $saved.ContainsKey($var)) { $saved[$var] = [Environment]::GetEnvironmentVariable($var, 'Process') }
        $value = az keyvault secret show --vault-name $Vault --name $name --query value -o tsv
        [Environment]::SetEnvironmentVariable($var, $value, 'Process')
        $loaded += $var
    }
    Remove-Variable value -ErrorAction SilentlyContinue
    Write-Host "run-with-keyvault: $($loaded.Count) secrets from ${Vault}: $($loaded -join ' ')"

    $exe = $Command[0]
    $rest = @($Command | Select-Object -Skip 1)
    & $exe @rest
    $code = $LASTEXITCODE
}
finally {
    foreach ($entry in $saved.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
}
exit $code
