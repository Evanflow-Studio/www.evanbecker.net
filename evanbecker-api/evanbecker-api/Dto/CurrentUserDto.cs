using evanbecker_domain.Entities;

namespace evanbecker_api.Dto;

/// <summary>
/// The signed-in user's own profile, as the user endpoints return it to that user: what the header and the account
/// page show. The Auth0 ID, the row's ID and the owner and admin flags stay in the API.
/// </summary>
public record CurrentUserDto(string? FirstName, string? LastName, string? Avatar, string? Email)
{
    public static CurrentUserDto From(User user) => new(user.FirstName, user.LastName, user.Avatar, user.Email);
}
