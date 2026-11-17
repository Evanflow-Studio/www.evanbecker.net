using evanbecker_domain.Entities;

namespace evanbecker_api.Dto;

/// <summary>
/// The signed-in user's own profile, as the user endpoints return it: every field the User row
/// serializes to, plus the private settings that comment payloads must not carry.
/// </summary>
public record CurrentUserDto(
    Guid Id,
    string? Auth0Id,
    string? Avatar,
    string? FirstName,
    string? LastName,
    string? Email,
    bool IsOwner,
    bool IsAdmin,
    bool NewsletterOptIn)
{
    public static CurrentUserDto From(User user) => new(
        user.Id, user.Auth0Id, user.Avatar, user.FirstName, user.LastName, user.Email,
        user.IsOwner, user.IsAdmin, user.NewsletterOptIn);
}
