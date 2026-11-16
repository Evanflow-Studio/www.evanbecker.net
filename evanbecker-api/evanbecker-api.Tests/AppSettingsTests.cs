using System.Text.Json;
using evanbecker_api.Configuration;
using Microsoft.Extensions.Configuration;

namespace evanbecker_api.Tests;

/// <summary>
/// Checks the settings files that ship in the image: each environment resolves its own
/// public Auth0 config, and no placeholder or retired key can come back.
/// </summary>
public class AppSettingsTests
{
    private static readonly string SettingsDir = Path.Combine(AppContext.BaseDirectory, "api-settings");

    // Layered the way ASP.NET Core does it: appsettings.json, then appsettings.{Environment}.json.
    private static IConfiguration ForEnvironment(string environment) =>
        new ConfigurationBuilder()
            .SetBasePath(SettingsDir)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: false)
            .Build();

    [Fact]
    public void Production_uses_the_prod_tenant_and_its_swagger_client()
    {
        var config = ForEnvironment("Production");

        Assert.Equal("evanbecker.us.auth0.com", config["Auth0:Domain"]);
        Assert.Equal("api.evanbecker.net", config["Auth0:Audience"]);
        // The prod tenant's app is JOV7... with a letter O. J0V7... with a zero is unknown to Auth0.
        Assert.Equal("JOV7J3Qv3XzFD3xyQjDEW03PtaU8bpqc", config["Auth0:ClientId"]);
    }

    [Fact]
    public void Test_uses_the_dev_tenant_and_the_test_client()
    {
        var config = ForEnvironment("Test");

        Assert.Equal("dev-m3uiopcp.us.auth0.com", config["Auth0:Domain"]);
        Assert.Equal("evanbecker.api", config["Auth0:Audience"]);
        Assert.Equal("2evqEjBNUmBVt6fNwcGkicfjNNrYsjV0", config["Auth0:ClientId"]);
    }

    public static TheoryData<string> SettingsFiles()
    {
        var data = new TheoryData<string>();
        foreach (var file in Directory.GetFiles(SettingsDir, "appsettings*.json"))
            data.Add(Path.GetFileName(file));
        return data;
    }

    [Theory]
    [MemberData(nameof(SettingsFiles))]
    public void Holds_no_placeholder_values(string file)
    {
        var placeholders = Leaves(file).Where(leaf => leaf.Value.Length > 0 && RequiredConfiguration.IsMissing(leaf.Value));

        Assert.Empty(placeholders);
    }

    [Theory]
    [MemberData(nameof(SettingsFiles))]
    public void Holds_no_retired_auth0_keys(string file)
    {
        var keys = Leaves(file).Select(leaf => leaf.Key).ToList();

        Assert.DoesNotContain("Auth0:ClientSecret", keys);
        Assert.DoesNotContain("Auth0:Url", keys);
    }

    [Fact]
    public void Auth0_configuration_binds_no_secret()
    {
        var properties = typeof(Auth0Configuration).GetProperties().Select(p => p.Name);

        Assert.Equal(["Domain", "Audience", "ClientId"], properties);
    }

    private static List<KeyValuePair<string, string>> Leaves(string file)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(SettingsDir, file)));
        var leaves = new List<KeyValuePair<string, string>>();
        Walk(doc.RootElement, "", leaves);
        return leaves;
    }

    private static void Walk(JsonElement element, string path, List<KeyValuePair<string, string>> leaves)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
                Walk(property.Value, path.Length == 0 ? property.Name : $"{path}:{property.Name}", leaves);
        }
        else
        {
            leaves.Add(new(path, element.ValueKind == JsonValueKind.String ? element.GetString()! : element.GetRawText()));
        }
    }
}
