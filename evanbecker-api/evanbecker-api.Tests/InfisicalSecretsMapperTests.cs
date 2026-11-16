using evanbecker_api.Configuration;

namespace evanbecker_api.Tests;

public class InfisicalSecretsMapperTests
{
    private readonly InfisicalSecretsMapper _mapper = new();

    [Theory]
    [InlineData("DB_CONNECTION_STRING", "ConnectionStrings:Database")]
    [InlineData("SMTP2GO_API_KEY", "Email:ApiKey")]
    [InlineData("RECAPTCHA_SECRET_KEY", "Recaptcha:SecretKey")]
    [InlineData("YOUTUBE_API_KEY", "YouTube:ApiKey")]
    [InlineData("Section__Key", "Section:Key")]
    public void Maps_secrets_to_their_settings(string secret, string setting)
    {
        Assert.Equal(setting, _mapper.MapKey(secret));
    }

    // Retired keys (never read), and public config that lives in appsettings.{Environment}.json.
    [Theory]
    [InlineData("AUTH0_CLIENT_SECRET")]
    [InlineData("AUTH0_URL")]
    [InlineData("AUTH0_DOMAIN")]
    [InlineData("AUTH0_AUDIENCE")]
    [InlineData("AUTH0_CLIENT_ID")]
    public void Ignores_auth0_keys(string secret)
    {
        Assert.Null(_mapper.MapKey(secret));
    }
}
