using evanbecker_api.Dto;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/user")]
public class UserController(IUserService userService) : ControllerBase
{
    /// <summary>Fetch the current user's profile from our database.</summary>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CurrentUserDto>> GetUserAsync()
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return NotFound();
        return CurrentUserDto.From(user);
    }

    /// <summary>
    /// Create or update the current user row using profile data from the client.
    /// Called once after login; resilient to database wipes.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType<CurrentUserDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserDto>> SyncUserAsync([FromBody] SyncUserDto dto)
    {
        var (user, isNew) = await userService.SyncUserAsync(User, dto);
        if (user == null) return Unauthorized();
        var body = CurrentUserDto.From(user);
        return isNew ? Created(string.Empty, body) : body;
    }

    /// <summary>Update the current user's profile (name, avatar) and settings (newsletter opt-in).</summary>
    [HttpPatch]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CurrentUserDto>> UpdateUserAsync([FromBody] UpdateUserDto dto)
    {
        var user = await userService.UpdateUserAsync(User, dto);
        if (user == null) return NotFound();
        return CurrentUserDto.From(user);
    }
}
