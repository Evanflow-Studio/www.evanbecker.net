using evanbecker_domain;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Extensions;

/// <summary>
/// When the EF migrations run. By default the API applies them at startup, as the homelab
/// deploy expects. A deploy that runs them as a separate step first (evanflow-infra
/// deploy/apps/ebn, deployment-strategy.md section 3) runs the image once with
/// <c>--migrate-only</c>, then starts the API with <c>Database__MigrateOnStartup=false</c>.
/// </summary>
public static class DatabaseMigrations
{
    public const string MigrateOnlyArgument = "--migrate-only";
    public const string MigrateOnStartupKey = "Database:MigrateOnStartup";

    public static bool IsMigrateOnly(IEnumerable<string> args) => args.Contains(MigrateOnlyArgument);

    /// <summary>The arguments for the host builder, without the ones only this class reads.</summary>
    public static string[] HostArguments(IEnumerable<string> args) =>
        args.Where(arg => arg != MigrateOnlyArgument).ToArray();

    /// <summary>True unless <c>Database:MigrateOnStartup</c> is set to false.</summary>
    public static bool MigrateOnStartup(IConfiguration configuration) =>
        configuration.GetValue(MigrateOnStartupKey, defaultValue: true);

    /// <summary>
    /// Applies every pending migration, then returns the process exit code: 0 when the
    /// database is up to date, 1 when it isn't. Logs migration names, never the connection string.
    /// </summary>
    public static async Task<int> MigrateOnlyAsync(IServiceProvider services, TextWriter? log = null)
    {
        log ??= Console.Out;
        try
        {
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();
            var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
            log.WriteLine(pending.Count == 0
                ? "migrate-only: the database is up to date."
                : $"migrate-only: applying {pending.Count} migration(s): {string.Join(", ", pending)}");
            await db.Database.MigrateAsync();
            log.WriteLine("migrate-only: done.");
            return 0;
        }
        catch (Exception e)
        {
            log.WriteLine($"migrate-only: failed: {e.GetType().Name}: {e.Message}");
            return 1;
        }
    }
}
