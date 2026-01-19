using evanbecker_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/user")]
public class UserController(IUserService userService) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetUserAsync()
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        return Ok(user);
    }
}