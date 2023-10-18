using evanbecker_domain;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Extensions;

public static class WebApplicationExtensions
{
    public static async Task UseLocalDockerMigrationsAsync(this WebApplication webApplication, string environmentName, int tries = 3)
    {
        // TODO: test Directory.GetCurrentDirectory() == "/app" part.
        if (environmentName != "LocalDocker" || Directory.GetCurrentDirectory() != "/app")
        {
            return;
        }

        try
        {
            using var scope = webApplication.Services.CreateScope();
            var dbf = new DesignTimeDbContextFactory();
            var db = dbf.CreateDbContext(new List<string> { environmentName }.ToArray());
            Console.WriteLine("Starting Migration...");
            await db.Database.MigrateAsync();
            Console.WriteLine("Migration Complete...");
        }
        catch (Exception e)
        {
            await Task.Delay(1000);

            Console.WriteLine($"Failed to apply migrations... Tries left: {tries}. {e.Message}");

            await UseLocalDockerMigrationsAsync(webApplication, environmentName, --tries);

            if (tries == 0)
                throw;
        }
    }
}