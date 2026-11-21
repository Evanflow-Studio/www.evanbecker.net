using System.Diagnostics;
using Npgsql;

namespace evanbecker_api.Tests.Guard;

/// <summary>
/// The Postgres the database-backed guard runs against: the connection string in <c>EBN_GUARD_DATABASE</c> when it's
/// set (scripts/test-api-with-postgres.sh sets it in CI), or else a throwaway postgres:18 container that this class
/// starts with Docker on a loopback port and removes afterwards. With neither, the test fails: it never skips.
/// </summary>
public sealed class GuardDatabase : IAsyncDisposable
{
    public const string Variable = "EBN_GUARD_DATABASE";

    private readonly string? _container;

    private GuardDatabase(string connectionString, string? container)
    {
        ConnectionString = connectionString;
        _container = container;
    }

    public string ConnectionString { get; }

    public static async Task<GuardDatabase> StartAsync()
    {
        var given = Environment.GetEnvironmentVariable(Variable);
        if (!string.IsNullOrWhiteSpace(given))
        {
            await WaitUntilReadyAsync(given);
            return new GuardDatabase(given, null);
        }

        var id = Guid.NewGuid().ToString("N")[..12];
        var name = $"ebn-guard-{id}";
        var password = $"guard-only-{id}"; // this container's own throwaway
        await DockerAsync($"run -d --rm --name {name} -e POSTGRES_USER=ebn -e POSTGRES_PASSWORD={password} " +
                          "-e POSTGRES_DB=ebn -p 127.0.0.1::5432 postgres:18");
        try
        {
            var published = (await DockerAsync($"port {name} 5432")).Split('\n')[0].Trim();
            var port = published[(published.LastIndexOf(':') + 1)..];
            var connectionString = $"Host=127.0.0.1;Port={port};Database=ebn;Username=ebn;Password={password}";
            await WaitUntilReadyAsync(connectionString);
            return new GuardDatabase(connectionString, name);
        }
        catch
        {
            await DockerAsync($"rm -f -v {name}", throwOnError: false);
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_container != null) await DockerAsync($"rm -f -v {_container}", throwOnError: false);
    }

    private static async Task WaitUntilReadyAsync(string connectionString)
    {
        var deadline = DateTime.UtcNow.AddSeconds(90);
        while (true)
        {
            try
            {
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();
                await using var command = new NpgsqlCommand("SELECT 1", connection);
                await command.ExecuteScalarAsync();
                return;
            }
            catch (Exception) when (DateTime.UtcNow < deadline)
            {
                await Task.Delay(500);
            }
            catch (Exception e)
            {
                throw new InvalidOperationException($"Postgres didn't accept connections within 90 s: {e.Message}");
            }
        }
    }

    private static async Task<string> DockerAsync(string arguments, bool throwOnError = true)
    {
        Process process;
        try
        {
            process = Process.Start(new ProcessStartInfo("docker", arguments)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            })!;
        }
        catch (Exception e) when (throwOnError)
        {
            throw new InvalidOperationException(
                $"The database-backed guard needs Docker, or a Postgres connection string in {Variable}: {e.Message}");
        }

        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        if (process.ExitCode != 0 && throwOnError)
            throw new InvalidOperationException(
                $"docker {arguments.Split(' ')[0]} failed ({process.ExitCode}): {(await error).Trim()}. " +
                $"The database-backed guard needs Docker, or a Postgres connection string in {Variable}.");
        return await output;
    }
}
