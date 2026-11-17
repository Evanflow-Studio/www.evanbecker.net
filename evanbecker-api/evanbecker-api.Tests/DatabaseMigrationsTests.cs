using evanbecker_api.Configuration;
using evanbecker_api.Extensions;
using evanbecker_domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace evanbecker_api.Tests;

public class DatabaseMigrationsTests
{
    private static IConfiguration Config(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    [Fact]
    public void Migrates_on_startup_by_default()
    {
        // The homelab deploy sets nothing and relies on this.
        Assert.True(DatabaseMigrations.MigrateOnStartup(Config(new())));
    }

    [Theory]
    [InlineData("false", false)]
    [InlineData("False", false)]
    [InlineData("true", true)]
    public void Database_MigrateOnStartup_switches_it(string value, bool expected)
    {
        var config = Config(new() { ["Database:MigrateOnStartup"] = value });

        Assert.Equal(expected, DatabaseMigrations.MigrateOnStartup(config));
    }

    [Fact]
    public void Reads_the_switch_from_its_environment_variable_name()
    {
        Environment.SetEnvironmentVariable("Database__MigrateOnStartup", "false");
        try
        {
            var config = new ConfigurationBuilder().AddEnvironmentVariables().Build();

            Assert.False(DatabaseMigrations.MigrateOnStartup(config));
        }
        finally
        {
            Environment.SetEnvironmentVariable("Database__MigrateOnStartup", null);
        }
    }

    [Fact]
    public void Recognises_migrate_only_and_keeps_it_from_the_host()
    {
        string[] args = ["--migrate-only", "--urls", "http://+:80"];

        Assert.True(DatabaseMigrations.IsMigrateOnly(args));
        Assert.False(DatabaseMigrations.IsMigrateOnly(["--urls", "http://+:80"]));
        Assert.Equal(["--urls", "http://+:80"], DatabaseMigrations.HostArguments(args));
    }

    [Fact]
    public void Migrate_only_needs_just_the_database()
    {
        var config = Config(new() { ["ConnectionStrings:Database"] = "Host=db" });

        RequiredConfiguration.Validate(config, migrateOnly: true);
    }

    [Fact]
    public void Migrate_only_still_needs_the_database()
    {
        var error = Assert.Throws<InvalidOperationException>(() => RequiredConfiguration.Validate(Config(new()), migrateOnly: true));

        Assert.Contains("ConnectionStrings:Database", error.Message);
        Assert.DoesNotContain("Auth0", error.Message);
    }

    [Fact]
    public async Task Migrate_only_exits_1_when_the_database_is_unreachable_without_printing_the_connection_string()
    {
        const string password = "not-a-real-password-7f3a";
        var services = new ServiceCollection()
            .AddDbContext<ApplicationContext>(o => o.UseNpgsql(
                $"Host=127.0.0.1;Port=1;Database=ebn;Username=ebn;Password={password};Timeout=2"))
            .BuildServiceProvider();
        var log = new StringWriter();

        var exitCode = await DatabaseMigrations.MigrateOnlyAsync(services, log);

        Assert.Equal(1, exitCode);
        Assert.Contains("migrate-only: failed", log.ToString());
        Assert.DoesNotContain(password, log.ToString());
    }
}
