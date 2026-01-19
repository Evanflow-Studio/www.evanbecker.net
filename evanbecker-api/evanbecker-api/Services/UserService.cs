using System.Security.Claims;
using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using evanbecker_api.Configuration;
using evanbecker_api.Extensions;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace evanbecker_api.Services;

public interface IUserService
{
    Task<User?> GetUserAsync(ClaimsPrincipal claimsUser);
}

public class UserService(
    ApplicationContext context,
    IOptions<Auth0Configuration> auth0Configuration)
    : IUserService
{
    public async Task<User?> GetUserAsync(ClaimsPrincipal claimsUser)
    {
        var authId = claimsUser?.GetAuthId();
        if (authId == null)
            return null;
        
        var user = await context
            .Users
            .SingleOrDefaultAsync(x => x.Auth0Id == authId);
        
        if (user != null)
            return user;
        
        var authClient = new AuthenticationApiClient(auth0Configuration.Value.Domain);
        var authToken = await authClient.GetTokenAsync(new ClientCredentialsTokenRequest
        {
            Audience = $"https://{auth0Configuration.Value.Domain}/api/v2/",
            ClientId = auth0Configuration.Value.ClientId,
            ClientSecret = auth0Configuration.Value.ClientSecret
        });

        // TODO: Move to some sort of Auth0Service
        var managementClient = new ManagementApiClient(authToken.AccessToken, auth0Configuration.Value.Domain);
        var auth0User = await managementClient.Users.GetAsync(authId);
            
        var newUser = new User
        {
            CreatedComments = new List<Comment>(),
            Auth0Id = authId,
            Email = auth0User.Email,
            FirstName = auth0User.FirstName,
            LastName = auth0User.LastName,
            Avatar = auth0User.Picture,
            IsAdmin = false,
            IsOwner = false,
        };

        var savedUser = await context.Users.AddAsync(newUser);
        await context.SaveChangesAsync();

        return savedUser.Entity;
    }
}