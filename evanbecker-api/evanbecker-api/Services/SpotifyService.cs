using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using evanbecker_api.Configuration;
using evanbecker_domain;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace evanbecker_api.Services;

public class SpotifyService : ISpotifyService
{
    private readonly SpotifyConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SpotifyService> _logger;
    private readonly ApplicationContext _context;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    public SpotifyService(
        IOptions<SpotifyConfiguration> config,
        HttpClient httpClient,
        IMemoryCache cache,
        ILogger<SpotifyService> logger,
        ApplicationContext context)
    {
        _config = config.Value;
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
        _context = context;
    }

    public string GetAuthorizationUrl(string state)
    {
        var scopes = "user-read-playback-state user-read-currently-playing streaming user-read-email user-read-private";
        var query = new Dictionary<string, string>
        {
            ["client_id"] = _config.ClientId ?? "",
            ["response_type"] = "code",
            ["redirect_uri"] = _config.RedirectUri ?? "",
            ["scope"] = scopes,
            ["state"] = state
        };

        var qs = string.Join("&", query.Select(kvp =>
            $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}"));

        return $"https://accounts.spotify.com/authorize?{qs}";
    }

    public async Task<SpotifyTokenResult> ExchangeCodeAsync(string code)
    {
        var tokenResponse = await RequestTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _config.RedirectUri ?? ""
        });

        var accessToken = tokenResponse.GetProperty("access_token").GetString() ?? "";
        var refreshToken = tokenResponse.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "";
        var expiresIn = tokenResponse.GetProperty("expires_in").GetInt32();

        // Fetch user profile to detect premium
        var profile = await GetUserProfileAsync(accessToken);
        var displayName = profile?.TryGetProperty("display_name", out var dn) == true ? dn.GetString() : null;
        var product = profile?.TryGetProperty("product", out var p) == true ? p.GetString() : null;

        return new SpotifyTokenResult
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = expiresIn,
            IsPremium = string.Equals(product, "premium", StringComparison.OrdinalIgnoreCase),
            DisplayName = displayName,
            ProductType = product
        };
    }

    public async Task<SpotifyTokenResult> RefreshTokenAsync(string refreshToken)
    {
        var tokenResponse = await RequestTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken
        });

        var accessToken = tokenResponse.GetProperty("access_token").GetString() ?? "";
        var newRefreshToken = tokenResponse.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? refreshToken : refreshToken;
        var expiresIn = tokenResponse.GetProperty("expires_in").GetInt32();

        return new SpotifyTokenResult
        {
            AccessToken = accessToken,
            RefreshToken = newRefreshToken,
            ExpiresIn = expiresIn
        };
    }

    public async Task<object?> GetNowPlayingAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/player/currently-playing");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
            return null;

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public async Task<object?> GetAudioAnalysisAsync(string trackId, string accessToken)
    {
        var cacheKey = $"spotify:analysis:{trackId}";

        if (_cache.TryGetValue(cacheKey, out object? cached))
            return cached;

        var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/audio-analysis/{trackId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Spotify audio analysis request failed with status {Status} for track {TrackId}",
                response.StatusCode, trackId);
            return null;
        }

        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        _cache.Set(cacheKey, result, CacheDuration);
        return result;
    }

    public async Task<object?> GetAudioFeaturesAsync(string trackId, string accessToken)
    {
        var cacheKey = $"spotify:features:{trackId}";

        if (_cache.TryGetValue(cacheKey, out object? cached))
            return cached;

        var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/audio-features/{trackId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Spotify audio features request failed with status {Status} for track {TrackId}",
                response.StatusCode, trackId);
            return null;
        }

        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        _cache.Set(cacheKey, result, CacheDuration);
        return result;
    }

    private async Task<JsonElement> RequestTokenAsync(Dictionary<string, string> formData)
    {
        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_config.ClientId}:{_config.ClientSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token")
        {
            Content = new FormUrlEncodedContent(formData)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<JsonElement?> GetUserProfileAsync(string accessToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch Spotify user profile");
            return null;
        }
    }

    public async Task SaveUserChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
