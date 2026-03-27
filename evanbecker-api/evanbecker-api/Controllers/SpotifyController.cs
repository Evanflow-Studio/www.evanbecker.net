using evanbecker_api.Dto;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/spotify")]
public class SpotifyController(ISpotifyService spotifyService, ILogger<SpotifyController> logger) : ControllerBase
{
    [HttpGet("auth-url")]
    public IActionResult GetAuthUrl([FromQuery] string? redirectUrl)
    {
        var state = redirectUrl ?? "/sandbox/raymarcher";
        var url = spotifyService.GetAuthorizationUrl(state);
        return Ok(new { url });
    }

    [HttpPost("callback")]
    public async Task<IActionResult> Callback([FromBody] SpotifyCallbackDto dto)
    {
        try
        {
            var result = await spotifyService.ExchangeCodeAsync(dto.Code);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify callback failed for code: {Code}", dto.Code?[..Math.Min(8, dto.Code?.Length ?? 0)]);
            return StatusCode(500, new { error = "Failed to exchange Spotify code", detail = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] SpotifyRefreshDto dto)
    {
        try
        {
            var result = await spotifyService.RefreshTokenAsync(dto.RefreshToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify token refresh failed");
            return StatusCode(500, new { error = "Failed to refresh token", detail = ex.Message });
        }
    }

    [HttpGet("now-playing")]
    public async Task<IActionResult> NowPlaying([FromHeader(Name = "X-Spotify-Token")] string accessToken)
    {
        try
        {
            var result = await spotifyService.GetNowPlayingAsync(accessToken);
            return result != null ? Ok(result) : NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify now-playing failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("analysis/{trackId}")]
    public async Task<IActionResult> Analysis(string trackId, [FromHeader(Name = "X-Spotify-Token")] string accessToken)
    {
        try
        {
            var result = await spotifyService.GetAudioAnalysisAsync(trackId, accessToken);
            return result != null ? Ok(result) : NotFound();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify analysis failed for track: {TrackId}", trackId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("features/{trackId}")]
    public async Task<IActionResult> Features(string trackId, [FromHeader(Name = "X-Spotify-Token")] string accessToken)
    {
        try
        {
            var result = await spotifyService.GetAudioFeaturesAsync(trackId, accessToken);
            return result != null ? Ok(result) : NotFound();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify features failed for track: {TrackId}", trackId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
