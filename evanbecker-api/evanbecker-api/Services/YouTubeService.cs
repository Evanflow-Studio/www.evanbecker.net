using System.Text.Json;
using evanbecker_api.Configuration;
using evanbecker_api.Dto;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace evanbecker_api.Services;

public class YouTubeService(
    IOptions<YouTubeConfiguration> config,
    HttpClient httpClient,
    IMemoryCache cache,
    ILogger<YouTubeService> logger) : IYouTubeService
{
    private const string BaseUrl = "https://www.googleapis.com/youtube/v3";
    private readonly string _apiKey = config.Value.ApiKey;

    public async Task<List<YouTubeSearchResultDto>> SearchAsync(string query, int maxResults = 10)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("YouTube API key not configured, skipping search.");
            return [];
        }

        var cacheKey = $"yt-search:{query}:{maxResults}";
        if (cache.TryGetValue(cacheKey, out List<YouTubeSearchResultDto>? cached) && cached is not null)
            return cached;

        var url = $"{BaseUrl}/search?part=snippet&type=video&videoCategoryId=10&maxResults={maxResults}&q={Uri.EscapeDataString(query)}&key={_apiKey}";

        try
        {
            var response = await httpClient.GetStringAsync(url);
            var doc = JsonDocument.Parse(response);
            var results = new List<YouTubeSearchResultDto>();

            foreach (var item in doc.RootElement.GetProperty("items").EnumerateArray())
            {
                var snippet = item.GetProperty("snippet");
                var videoId = item.GetProperty("id").GetProperty("videoId").GetString() ?? "";
                results.Add(new YouTubeSearchResultDto(
                    videoId,
                    snippet.GetProperty("title").GetString() ?? "",
                    snippet.GetProperty("channelTitle").GetString() ?? "",
                    snippet.GetProperty("thumbnails").GetProperty("medium").GetProperty("url").GetString() ?? ""));
            }

            cache.Set(cacheKey, results, TimeSpan.FromMinutes(5));
            return results;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "YouTube search failed for query: {Query}", query);
            return [];
        }
    }

    public async Task<YouTubeVideoDetailDto?> GetVideoDetailsAsync(string videoId)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("YouTube API key not configured, skipping video details.");
            return null;
        }

        var cacheKey = $"yt-video:{videoId}";
        if (cache.TryGetValue(cacheKey, out YouTubeVideoDetailDto? cached) && cached is not null)
            return cached;

        var url = $"{BaseUrl}/videos?part=snippet,contentDetails&id={Uri.EscapeDataString(videoId)}&key={_apiKey}";

        try
        {
            var response = await httpClient.GetStringAsync(url);
            var doc = JsonDocument.Parse(response);
            var items = doc.RootElement.GetProperty("items");

            if (items.GetArrayLength() == 0)
                return null;

            var item = items[0];
            var snippet = item.GetProperty("snippet");
            var contentDetails = item.GetProperty("contentDetails");

            var tags = new List<string>();
            if (snippet.TryGetProperty("tags", out var tagsElement))
            {
                foreach (var tag in tagsElement.EnumerateArray())
                    tags.Add(tag.GetString() ?? "");
            }

            var result = new YouTubeVideoDetailDto(
                videoId,
                snippet.GetProperty("title").GetString() ?? "",
                snippet.GetProperty("channelTitle").GetString() ?? "",
                snippet.GetProperty("thumbnails").GetProperty("medium").GetProperty("url").GetString() ?? "",
                contentDetails.GetProperty("duration").GetString() ?? "",
                snippet.GetProperty("description").GetString() ?? "",
                tags);

            cache.Set(cacheKey, result, TimeSpan.FromHours(24));
            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "YouTube video detail fetch failed for: {VideoId}", videoId);
            return null;
        }
    }
}
