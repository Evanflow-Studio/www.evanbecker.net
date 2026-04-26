using System.Security.Claims;
using evanbecker_api.Dto;
using evanbecker_api.Extensions;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Services;

public interface IUserService
{
    /// <summary>Fetch the current user row. Returns null if not found.</summary>
    Task<User?> GetUserAsync(ClaimsPrincipal claimsUser);

    /// <summary>
    /// Create-or-update the user row from Auth0 ID token data supplied by the client.
    /// Auth0 is used only for identity (sub). Name/email come from the frontend.
    /// Returns (user, isNew) — isNew is true when the row was just created.
    /// </summary>
    Task<(User? User, bool IsNew)> SyncUserAsync(ClaimsPrincipal claimsUser, SyncUserDto dto);

    /// <summary>Update the user's own profile fields.</summary>
    Task<User?> UpdateUserAsync(ClaimsPrincipal claimsUser, UpdateUserDto dto);
}

public class UserService(ApplicationContext context) : IUserService
{
    public async Task<User?> GetUserAsync(ClaimsPrincipal claimsUser)
    {
        var authId = claimsUser?.GetAuthId();
        if (authId == null) return null;

        return await context.Users.FirstOrDefaultAsync(x => x.Auth0Id == authId);
    }

    public async Task<(User? User, bool IsNew)> SyncUserAsync(ClaimsPrincipal claimsUser, SyncUserDto dto)
    {
        var authId = claimsUser?.GetAuthId();
        if (authId == null) return (null, false);

        var user = await context.Users.FirstOrDefaultAsync(x => x.Auth0Id == authId);

        if (user != null)
        {
            // Backfill any fields that were null when the row was first created
            var dirty = false;
            if (user.FirstName == null && dto.FirstName != null) { user.FirstName = dto.FirstName; dirty = true; }
            if (user.LastName  == null && dto.LastName  != null) { user.LastName  = dto.LastName;  dirty = true; }
            if (user.Email     == null && dto.Email     != null) { user.Email     = dto.Email;     dirty = true; }
            if (dirty) await context.SaveChangesAsync();
            return (user, false);
        }

        var newUser = new User
        {
            Auth0Id   = authId,
            FirstName = dto.FirstName,
            LastName  = dto.LastName,
            Email     = dto.Email,
            IsAdmin   = false,
            IsOwner   = false,
        };

        await context.Users.AddAsync(newUser);
        await context.SaveChangesAsync();
        return (newUser, true);
    }

    public async Task<User?> UpdateUserAsync(ClaimsPrincipal claimsUser, UpdateUserDto dto)
    {
        var authId = claimsUser?.GetAuthId();
        if (authId == null) return null;

        var user = await context.Users.FirstOrDefaultAsync(x => x.Auth0Id == authId);
        if (user == null) return null;

        if (dto.FirstName != null) user.FirstName = dto.FirstName;
        if (dto.LastName  != null) user.LastName  = dto.LastName;
        if (dto.Avatar    != null) user.Avatar    = dto.Avatar == "" ? null : dto.Avatar;

        await context.SaveChangesAsync();
        return user;
    }
}
