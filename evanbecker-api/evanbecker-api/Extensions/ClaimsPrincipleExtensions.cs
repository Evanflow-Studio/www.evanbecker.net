using System.Security.Claims;

namespace evanbecker_api.Extensions;

public static class ClaimsPrincipleExtensions
{
    public static string? GetAuthId(this ClaimsPrincipal user)
    {
        return user.Claims
            .SingleOrDefault(x => x.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")
            ?.Value;
    }
}