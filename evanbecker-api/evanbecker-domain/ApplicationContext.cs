using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace evanbecker_domain;

public class ApplicationContext : DbContext
{                       
    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options) { }

    public DbSet<Comment> Comments { get; set; }
    public DbSet<Reply> Replies { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<ContactMessage> ContactMessages { get; set; }
    public DbSet<NewsLetterEntry> NewsLetterEntries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .Entity<Comment>()
            .HasOne(x => x.Author)
            .WithMany(x => x.CreatedComments);
    }
}

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationContext>
{
    public ApplicationContext CreateDbContext(string[] args)
    {
        Console.WriteLine("Building ApplicationContext");

        var baseDirectory = Directory.GetCurrentDirectory() == "/app" 
            ? Directory.GetCurrentDirectory() + "/"
            : Directory.GetCurrentDirectory() + "/../evanbecker-api/";

        var secretsPath = $"{baseDirectory}secrets/appsettings.secrets.json";
        var defaultPath = $"{baseDirectory}appsettings.json";
        var environment = Array.FindAll(args, e => e.Equals("Development") || e.Equals("LocalDocker"))
            .SingleOrDefault();
        var appSettingsPath = args.Any()
            ? baseDirectory + environment switch
            {
                "Development" => "appsettings.Development.json",
                "LocalDocker" => "appsettings.LocalDocker.json",
                _ => throw new NotSupportedException(
                    $"Only accepting one argument: <Environment> | Argument provided was Environment: [{environment}].")
            }
            : $"{baseDirectory}appsettings.Development.json";
        
        Console.WriteLine($"Using AppSettings File: {appSettingsPath}");

        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile(defaultPath, false)
            .AddJsonFile(appSettingsPath, true)
            .AddJsonFile(secretsPath, true)
            .Build();
        
        var builder = new DbContextOptionsBuilder<ApplicationContext>();
        var connectionString = configuration.GetConnectionString("Database");
        builder.UseNpgsql(connectionString, options => options.UseAdminDatabase("postgres"));
        return new ApplicationContext(builder.Options);
    }
}