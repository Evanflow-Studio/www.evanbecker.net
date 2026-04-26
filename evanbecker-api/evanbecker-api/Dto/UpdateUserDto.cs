namespace evanbecker_api.Dto;

/// <summary>
/// Payload for updating a user's own profile.
/// Null = don't change. Empty string on Avatar = reset to initials.
/// </summary>
public record UpdateUserDto(string? FirstName, string? LastName, string? Avatar);
