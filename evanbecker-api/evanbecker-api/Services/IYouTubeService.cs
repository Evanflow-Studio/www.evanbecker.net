using evanbecker_api.Dto;

namespace evanbecker_api.Services;

public interface IYouTubeService
{
    Task<List<YouTubeSearchResultDto>> SearchAsync(string query, int maxResults = 10);
    Task<YouTubeVideoDetailDto?> GetVideoDetailsAsync(string videoId);
}
