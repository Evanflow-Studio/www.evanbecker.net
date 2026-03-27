using evanbecker_api.Dto;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/spotify")]
public class SpotifyController(
    ISpotifyService spotifyService,
    IUserService userService,
    ILogger<SpotifyController> logger) : ControllerBase
{
    // --- Public endpoints (existing) ---

    [HttpGet("auth-url")]
    public IActionResult GetAuthUrl([FromQuery] string? redirectUrl)
    {
        var state = redirectUrl ?? "/account";
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

    // --- Authenticated endpoints (new) ---

    [HttpPost("connect")]
    [Authorize]
    public async Task<IActionResult> Connect([FromBody] SpotifyCallbackDto dto)
    {
        try
        {
            var user = await userService.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var result = await spotifyService.ExchangeCodeAsync(dto.Code);

            user.SpotifyAccessToken = result.AccessToken;
            user.SpotifyRefreshToken = result.RefreshToken;
            user.SpotifyTokenExpiry = DateTime.UtcNow.AddSeconds(result.ExpiresIn);
            user.SpotifyPremium = result.IsPremium;
            user.SpotifyDisplayName = result.DisplayName;

            await spotifyService.SaveUserChangesAsync();

            return Ok(new
            {
                connected = true,
                premium = result.IsPremium,
                displayName = result.DisplayName
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify connect failed");
            return StatusCode(500, new { error = "Failed to connect Spotify", detail = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        try
        {
            var user = await userService.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (string.IsNullOrEmpty(user.SpotifyRefreshToken))
            {
                return Ok(new
                {
                    connected = false,
                    premium = false,
                    displayName = (string?)null,
                    tokenValid = false
                });
            }

            // Auto-refresh if token is expired or about to expire
            var tokenValid = user.SpotifyTokenExpiry.HasValue && user.SpotifyTokenExpiry.Value > DateTime.UtcNow.AddMinutes(1);
            if (!tokenValid)
            {
                try
                {
                    var refreshed = await spotifyService.RefreshTokenAsync(user.SpotifyRefreshToken);
                    user.SpotifyAccessToken = refreshed.AccessToken;
                    if (!string.IsNullOrEmpty(refreshed.RefreshToken))
                        user.SpotifyRefreshToken = refreshed.RefreshToken;
                    user.SpotifyTokenExpiry = DateTime.UtcNow.AddSeconds(refreshed.ExpiresIn);
                    await spotifyService.SaveUserChangesAsync();
                    tokenValid = true;
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to auto-refresh Spotify token for user {UserId}", user.Id);
                    tokenValid = false;
                }
            }

            return Ok(new
            {
                connected = true,
                premium = user.SpotifyPremium,
                displayName = user.SpotifyDisplayName,
                tokenValid
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify me failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("disconnect")]
    [Authorize]
    public async Task<IActionResult> Disconnect()
    {
        try
        {
            var user = await userService.GetUserAsync(User);
            if (user == null) return Unauthorized();

            user.SpotifyAccessToken = null;
            user.SpotifyRefreshToken = null;
            user.SpotifyTokenExpiry = null;
            user.SpotifyPremium = false;
            user.SpotifyDisplayName = null;

            await spotifyService.SaveUserChangesAsync();

            return Ok(new { disconnected = true });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify disconnect failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("token")]
    [Authorize]
    public async Task<IActionResult> Token()
    {
        try
        {
            var user = await userService.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (string.IsNullOrEmpty(user.SpotifyRefreshToken))
                return BadRequest(new { error = "Spotify not connected" });

            // Auto-refresh if expired or about to expire
            if (!user.SpotifyTokenExpiry.HasValue || user.SpotifyTokenExpiry.Value < DateTime.UtcNow.AddMinutes(1))
            {
                var refreshed = await spotifyService.RefreshTokenAsync(user.SpotifyRefreshToken);
                user.SpotifyAccessToken = refreshed.AccessToken;
                if (!string.IsNullOrEmpty(refreshed.RefreshToken))
                    user.SpotifyRefreshToken = refreshed.RefreshToken;
                user.SpotifyTokenExpiry = DateTime.UtcNow.AddSeconds(refreshed.ExpiresIn);
                await spotifyService.SaveUserChangesAsync();
            }

            return Ok(new
            {
                accessToken = user.SpotifyAccessToken,
                expiresIn = user.SpotifyTokenExpiry.HasValue
                    ? (int)(user.SpotifyTokenExpiry.Value - DateTime.UtcNow).TotalSeconds
                    : 0,
                premium = user.SpotifyPremium
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Spotify token retrieval failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
