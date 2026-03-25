namespace evanbecker_api.Configuration;

/// <summary>
/// Maps flat secret keys from an external provider to .NET configuration paths.
/// Implementations define the key mapping for their specific provider.
/// </summary>
public interface ISecretsMapper
{
    /// <summary>
    /// Maps a flat secret key (e.g., "DB_CONNECTION_STRING") to a .NET config path
    /// (e.g., "ConnectionStrings:Database"). Returns null if the key is unmapped.
    /// </summary>
    string? MapKey(string secretKey);
}
