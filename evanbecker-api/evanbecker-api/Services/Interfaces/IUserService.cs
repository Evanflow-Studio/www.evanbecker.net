using System.Security.Claims;
using evanbecker_domain.Entities;

namespace evanbecker_api.Services.Interfaces;

public interface IUserService
{
    Task<User?> GetUser(ClaimsPrincipal claimsUser);
}