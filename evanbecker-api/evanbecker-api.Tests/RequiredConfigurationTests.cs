using evanbecker_api.Configuration;
using Microsoft.Extensions.Configuration;

namespace evanbecker_api.Tests;

public class RequiredConfigurationTests
{
    private static IConfiguration Config(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    private static Dictionary<string, string?> AllRequired() => new()
    {
        ["ConnectionStrings:Database"] = "Host=db;Password=not-a-real-password",
        ["Auth0:Domain"] = "tenant.example.com",
        ["Auth0:Audience"] = "api.example.com",
        ["Auth0:ClientId"] = "client-id",
    };

    [Fact]
    public void Passes_when_every_required_setting_is_present()
    {
        RequiredConfiguration.Validate(Config(AllRequired()));
    }

    [Theory]
    [InlineData("ConnectionStrings:Database")]
    [InlineData("Auth0:Domain")]
    [InlineData("Auth0:Audience")]
    [InlineData("Auth0:ClientId")]
    public void Fails_naming_the_missing_setting(string key)
    {
        var values = AllRequired();
        values.Remove(key);

        var error = Assert.Throws<InvalidOperationException>(() => RequiredConfiguration.Validate(Config(values)));

        Assert.Contains(key, error.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("<FROM SECRETS>")]
    public void Treats_empty_values_and_placeholders_as_missing(string value)
    {
        var values = AllRequired();
        values["Auth0:ClientId"] = value;

        var error = Assert.Throws<InvalidOperationException>(() => RequiredConfiguration.Validate(Config(values)));

        Assert.Contains("Auth0:ClientId", error.Message);
    }

    [Fact]
    public void Never_prints_a_value()
    {
        var values = AllRequired();
        values.Remove("Auth0:Domain");

        var error = Assert.Throws<InvalidOperationException>(() => RequiredConfiguration.Validate(Config(values)));

        Assert.DoesNotContain("not-a-real-password", error.Message);
        Assert.DoesNotContain("client-id", error.Message);
    }
}
