using System.Security.Claims;
using evanbecker_api.Extensions;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Services;

public interface IUserService
{
    Task<User?> GetUserAsync(ClaimsPrincipal claimsUser);
}

public class UserService(ApplicationContext context) : IUserService
{
    public async Task<User?> GetUserAsync(ClaimsPrincipal claimsUser)
    {
        var authId = claimsUser?.GetAuthId();
        if (authId == null)
            return null;

        var user = await context.Users
            .SingleOrDefaultAsync(x => x.Auth0Id == authId);

        if (user != null)
            return user;

        // New user — create from JWT claims (no Auth0 Management API needed).
        // Auth0 JWTs include standard claims when configured with default scopes.
        var email = claimsUser!.FindFirstValue(ClaimTypes.Email)
                    ?? claimsUser.FindFirstValue("email");
        var name = claimsUser.FindFirstValue("name")
                   ?? claimsUser.FindFirstValue(ClaimTypes.Name);
        var picture = claimsUser.FindFirstValue("picture");

        // Split "name" into first/last if available
        string? firstName = null;
        string? lastName = null;
        if (!string.IsNullOrEmpty(name))
        {
            var parts = name.Split(' ', 2);
            firstName = parts[0];
            lastName = parts.Length > 1 ? parts[1] : null;
        }

        var newUser = new User
        {
            Auth0Id = authId,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Avatar = picture,
            IsAdmin = false,
            IsOwner = false,
        };

        await context.Users.AddAsync(newUser);
        await context.SaveChangesAsync();

        return newUser;
    }
}
