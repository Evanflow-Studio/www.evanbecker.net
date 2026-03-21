using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace evanbecker_api.Configuration;

/// <summary>
/// Pulls secrets from Infisical at startup and maps them to .NET configuration paths.
/// Skips gracefully when INFISICAL_CLIENT_ID is not set (local dev).
/// </summary>
public class InfisicalConfigurationSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder) =>
        new InfisicalConfigurationProvider();
}

public class InfisicalConfigurationProvider : ConfigurationProvider
{
    // Maps Infisical flat keys → .NET configuration paths.
    // Add new secrets here as needed.
    private static readonly Dictionary<string, string> KeyMap = new()
    {
        ["DB_CONNECTION_STRING"] = "ConnectionStrings:Database",
        ["AUTH0_DOMAIN"] = "Auth0:Domain",
        ["AUTH0_AUDIENCE"] = "Auth0:Audience",
        ["AUTH0_CLIENT_ID"] = "Auth0:ClientId",
        ["AUTH0_CLIENT_SECRET"] = "Auth0:ClientSecret",
        ["AUTH0_URL"] = "Auth0:Url",
    };

    public override void Load()
    {
        var clientId = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_ID");
        var clientSecret = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_SECRET");
        var address = Environment.GetEnvironmentVariable("INFISICAL_ADDRESS");
        var projectId = Environment.GetEnvironmentVariable("INFISICAL_PROJECT_ID");
        var environment = Environment.GetEnvironmentVariable("INFISICAL_ENVIRONMENT");

        if (string.IsNullOrEmpty(clientId))
        {
            Console.WriteLine("Infisical: INFISICAL_CLIENT_ID not set, skipping (using local config).");
            return;
        }

        if (string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(address) ||
            string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(environment))
        {
            throw new InvalidOperationException(
                "Infisical: INFISICAL_CLIENT_ID is set but other required vars are missing. " +
                "Need: INFISICAL_CLIENT_SECRET, INFISICAL_ADDRESS, INFISICAL_PROJECT_ID, INFISICAL_ENVIRONMENT");
        }

        Console.WriteLine($"Infisical: Loading secrets for environment '{environment}'...");

        try
        {
            var accessToken = Authenticate(address, clientId, clientSecret);
            var secrets = FetchSecrets(address, accessToken, projectId, environment);

            Console.WriteLine($"Infisical: Loaded {secrets.Count} secrets.");
            foreach (var secret in secrets)
            {
                if (KeyMap.TryGetValue(secret.SecretKey, out var configPath))
                {
                    Data[configPath] = secret.SecretValue;
                }
                else if (secret.SecretKey.Contains("__"))
                {
                    Data[secret.SecretKey.Replace("__", ":")] = secret.SecretValue;
                }
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"Infisical: Failed to load secrets from {address}. " +
                $"Ensure Infisical is reachable and credentials are correct.", ex);
        }
    }

    private static string Authenticate(string address, string clientId, string clientSecret)
    {
        using var http = new HttpClient();
        var response = http.PostAsJsonAsync(
            $"{address}/api/v1/auth/universal-auth/login",
            new { clientId, clientSecret }
        ).GetAwaiter().GetResult();

        response.EnsureSuccessStatusCode();

        var result = response.Content.ReadFromJsonAsync<AuthResponse>().GetAwaiter().GetResult()
            ?? throw new InvalidOperationException("Infisical: Empty auth response.");

        return result.AccessToken;
    }

    private static List<SecretEntry> FetchSecrets(
        string address, string accessToken, string projectId, string environment)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var url = $"{address}/api/v3/secrets/raw" +
                  $"?environment={Uri.EscapeDataString(environment)}" +
                  $"&workspaceId={Uri.EscapeDataString(projectId)}" +
                  $"&secretPath=/";

        var response = http.GetAsync(url).GetAwaiter().GetResult();
        response.EnsureSuccessStatusCode();

        var result = response.Content.ReadFromJsonAsync<SecretsResponse>().GetAwaiter().GetResult()
            ?? throw new InvalidOperationException("Infisical: Empty secrets response.");

        return result.Secrets;
    }

    // JSON models for Infisical REST API responses
    private record AuthResponse(
        [property: JsonPropertyName("accessToken")] string AccessToken);

    private record SecretsResponse(
        [property: JsonPropertyName("secrets")] List<SecretEntry> Secrets);

    internal record SecretEntry(
        [property: JsonPropertyName("secretKey")] string SecretKey,
        [property: JsonPropertyName("secretValue")] string SecretValue);
}

public static class InfisicalConfigurationExtensions
{
    public static IConfigurationBuilder AddInfisical(this IConfigurationBuilder builder)
    {
        builder.Add(new InfisicalConfigurationSource());
        return builder;
    }
}
