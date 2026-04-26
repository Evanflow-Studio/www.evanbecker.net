using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace evanbecker_api.Configuration;

/// <summary>
/// Configuration source that pulls secrets from an external provider at startup.
/// Currently backed by Infisical. The provider is decoupled from the key mapping
/// via ISecretsMapper, so swapping providers only requires a new mapper.
///
/// Skips gracefully when INFISICAL_CLIENT_ID is not set (local dev falls back to appsettings).
/// </summary>
public class SecretsConfigurationSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder) =>
        new SecretsConfigurationProvider(new InfisicalSecretsMapper());
}

public class SecretsConfigurationProvider : ConfigurationProvider
{
    private readonly ISecretsMapper _mapper;

    public SecretsConfigurationProvider(ISecretsMapper mapper)
    {
        _mapper = mapper;
    }

    public override void Load()
    {
        var clientId = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_ID");
        var clientSecret = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_SECRET");
        var address = Environment.GetEnvironmentVariable("INFISICAL_ADDRESS");
        var projectId = Environment.GetEnvironmentVariable("INFISICAL_PROJECT_ID");
        var environment = Environment.GetEnvironmentVariable("INFISICAL_ENVIRONMENT");

        if (string.IsNullOrEmpty(clientId))
        {
            Console.WriteLine("Secrets: No INFISICAL_CLIENT_ID set, skipping remote secrets (using local config).");
            return;
        }

        if (string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(address) ||
            string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(environment))
        {
            throw new InvalidOperationException(
                "Secrets: INFISICAL_CLIENT_ID is set but other required vars are missing. " +
                "Need: INFISICAL_CLIENT_SECRET, INFISICAL_ADDRESS, INFISICAL_PROJECT_ID, INFISICAL_ENVIRONMENT");
        }

        Console.WriteLine($"Secrets: Loading from Infisical for environment '{environment}'...");

        try
        {
            var accessToken = Authenticate(address, clientId, clientSecret);
            var secrets = FetchSecrets(address, accessToken, projectId, environment);

            var mapped = 0;
            foreach (var secret in secrets)
            {
                var configPath = _mapper.MapKey(secret.SecretKey);
                if (configPath != null)
                {
                    Data[configPath] = secret.SecretValue;
                    mapped++;
                }
            }

            Console.WriteLine($"Secrets: Loaded {secrets.Count} secrets, mapped {mapped} to configuration.");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"Secrets: Failed to load from {address}. " +
                $"Ensure the provider is reachable and credentials are correct.", ex);
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
            ?? throw new InvalidOperationException("Secrets: Empty auth response.");

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
            ?? throw new InvalidOperationException("Secrets: Empty secrets response.");

        return result.Secrets;
    }

    // JSON models for Infisical REST API
    private record AuthResponse(
        [property: JsonPropertyName("accessToken")] string AccessToken);

    private record SecretsResponse(
        [property: JsonPropertyName("secrets")] List<SecretEntry> Secrets);

    internal record SecretEntry(
        [property: JsonPropertyName("secretKey")] string SecretKey,
        [property: JsonPropertyName("secretValue")] string SecretValue);
}

public static class SecretsConfigurationExtensions
{
    public static IConfigurationBuilder AddSecrets(this IConfigurationBuilder builder)
    {
        builder.Add(new SecretsConfigurationSource());
        return builder;
    }
}
