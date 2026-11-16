namespace evanbecker_api.Configuration;

/// <summary>
/// Maps Infisical flat secret keys to .NET configuration paths.
/// This is the only class that knows about Infisical's key naming convention.
/// Add new secrets here as needed.
/// </summary>
public class InfisicalSecretsMapper : ISecretsMapper
{
    private static readonly Dictionary<string, string> KeyMap = new()
    {
        // Auth0's domain, audience and client ID are public config in appsettings.{Environment}.json,
        // so a stale vault value can't override them. AUTH0_CLIENT_SECRET and AUTH0_URL were never read.
        ["DB_CONNECTION_STRING"] = "ConnectionStrings:Database",
        ["SMTP2GO_API_KEY"] = "Email:ApiKey",
        ["EMAIL_FROM_ADDRESS"] = "Email:FromAddress",
        ["EMAIL_TO_ADDRESS"] = "Email:ToAddress",
        ["RECAPTCHA_SECRET_KEY"] = "Recaptcha:SecretKey",
        ["YOUTUBE_API_KEY"] = "YouTube:ApiKey",
    };

    public string? MapKey(string secretKey)
    {
        if (KeyMap.TryGetValue(secretKey, out var configPath))
            return configPath;

        // Fallback: keys with "__" are treated as nested config paths (e.g., "Section__Key" → "Section:Key")
        if (secretKey.Contains("__"))
            return secretKey.Replace("__", ":");

        return null;
    }
}
