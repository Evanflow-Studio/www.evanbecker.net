using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace evanbecker_api.Services;

public class RecaptchaSettings
{
    public string SecretKey { get; set; } = "";
    public float MinScore { get; set; } = 0.5f;
}

public interface IRecaptchaService
{
    Task<bool> VerifyAsync(string token);
}

public class RecaptchaService : IRecaptchaService
{
    private readonly RecaptchaSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<RecaptchaService> _logger;

    public RecaptchaService(IOptions<RecaptchaSettings> settings, HttpClient httpClient, ILogger<RecaptchaService> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<bool> VerifyAsync(string token)
    {
        if (string.IsNullOrEmpty(_settings.SecretKey))
        {
            _logger.LogWarning("reCAPTCHA secret key not configured, skipping verification.");
            return true;
        }

        if (string.IsNullOrEmpty(token))
            return false;

        var response = await _httpClient.PostAsync(
            "https://www.google.com/recaptcha/api/siteverify",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = _settings.SecretKey,
                ["response"] = token
            }));

        var result = await response.Content.ReadFromJsonAsync<RecaptchaResponse>();
        if (result is null)
            return false;

        _logger.LogInformation("reCAPTCHA verify: success={Success}, score={Score}, action={Action}",
            result.Success, result.Score, result.Action);

        return result.Success && result.Score >= _settings.MinScore;
    }

    private record RecaptchaResponse(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("score")] float Score,
        [property: JsonPropertyName("action")] string? Action,
        [property: JsonPropertyName("challenge_ts")] string? ChallengeTs,
        [property: JsonPropertyName("hostname")] string? Hostname,
        [property: JsonPropertyName("error-codes")] string[]? ErrorCodes);
}
