using evanbecker_api.Dto;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/spotify")]
public class SpotifyController(ISpotifyService spotifyService) : ControllerBase
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
        var result = await spotifyService.ExchangeCodeAsync(dto.Code);
        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] SpotifyRefreshDto dto)
    {
        var result = await spotifyService.RefreshTokenAsync(dto.RefreshToken);
        return Ok(result);
    }

    [HttpGet("now-playing")]
    public async Task<IActionResult> NowPlaying([FromHeader(Name = "X-Spotify-Token")] string accessToken)
    {
        var result = await spotifyService.GetNowPlayingAsync(accessToken);
        return result != null ? Ok(result) : NoContent();
    }

    [HttpGet("analysis/{trackId}")]
    public async Task<IActionResult> Analysis(string trackId, [FromHeader(Name = "X-Spotify-Token")] string accessToken)
    {
        var result = await spotifyService.GetAudioAnalysisAsync(trackId, accessToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpGet("features/{trackId}")]
    public async Task<IActionResult> Features(string trackId, [FromHeader(Name = "X-Spotify-Token")] string accessToken)
    {
        var result = await spotifyService.GetAudioFeaturesAsync(trackId, accessToken);
        return result != null ? Ok(result) : NotFound();
    }
}
