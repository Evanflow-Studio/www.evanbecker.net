namespace evanbecker_api.Services;

public interface ISpotifyService
{
    string GetAuthorizationUrl(string state);
    Task<SpotifyTokenResult> ExchangeCodeAsync(string code);
    Task<SpotifyTokenResult> RefreshTokenAsync(string refreshToken);
    Task<object?> GetNowPlayingAsync(string accessToken);
    Task<object?> GetAudioAnalysisAsync(string trackId, string accessToken);
    Task<object?> GetAudioFeaturesAsync(string trackId, string accessToken);
    Task SaveUserChangesAsync();
}

public class SpotifyTokenResult
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public int ExpiresIn { get; set; }
    public bool IsPremium { get; set; }
    public string? DisplayName { get; set; }
    public string? ProductType { get; set; }
}
