using evanbecker_domain;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Extensions;

public static class WebApplicationExtensions
{
    public static async Task UseLocalDockerMigrationsAsync(this WebApplication webApplication, string environmentName, int tries = 3)
    {
        if (Directory.GetCurrentDirectory() != "/app")
        {
            return;
        }

        try
        {
            using var scope = webApplication.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();
            Console.WriteLine("Starting Migration...");
            await db.Database.MigrateAsync();
            Console.WriteLine("Migration Complete...");
        }
        catch (Exception e)
        {
            if (tries <= 0)
                throw;

            Console.WriteLine($"Failed to apply migrations... Tries left: {tries}. {e.Message}");
            await Task.Delay(3000);
            await UseLocalDockerMigrationsAsync(webApplication, environmentName, tries - 1);
        }
    }
}
