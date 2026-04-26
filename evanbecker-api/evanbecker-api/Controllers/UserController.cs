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
    public async Task<IActionResult> GetUserAsync()
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return NotFound();
        return Ok(user);
    }

    /// <summary>
    /// Create or update the current user row using profile data from the client.
    /// Called once after login; resilient to database wipes.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> SyncUserAsync([FromBody] SyncUserDto dto)
    {
        var (user, isNew) = await userService.SyncUserAsync(User, dto);
        if (user == null) return Unauthorized();
        return isNew ? Created(string.Empty, user) : Ok(user);
    }

    /// <summary>Update the current user's profile (name, avatar).</summary>
    [HttpPatch]
    [Authorize]
    public async Task<IActionResult> UpdateUserAsync([FromBody] UpdateUserDto dto)
    {
        var user = await userService.UpdateUserAsync(User, dto);
        if (user == null) return NotFound();
        return Ok(user);
    }
}
