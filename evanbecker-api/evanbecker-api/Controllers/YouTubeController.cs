using evanbecker_api.Services;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/youtube")]
public class YouTubeController(IYouTubeService youTubeService) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int maxResults = 10)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest("Query parameter 'q' is required.");

        maxResults = Math.Clamp(maxResults, 1, 25);
        var results = await youTubeService.SearchAsync(q, maxResults);
        return Ok(results);
    }

    [HttpGet("video/{videoId}")]
    public async Task<IActionResult> GetVideo(string videoId)
    {
        if (string.IsNullOrWhiteSpace(videoId))
            return BadRequest("Video ID is required.");

        var result = await youTubeService.GetVideoDetailsAsync(videoId);
        return result is not null ? Ok(result) : NotFound();
    }
}
