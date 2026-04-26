namespace evanbecker_api.Dto;

public record YouTubeSearchResultDto(
    string VideoId,
    string Title,
    string ChannelTitle,
    string ThumbnailUrl);

public record YouTubeVideoDetailDto(
    string VideoId,
    string Title,
    string ChannelTitle,
    string ThumbnailUrl,
    string Duration,
    string Description,
    List<string> Tags);
