using System.Security.Claims;
using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Auth0.ManagementApi.Paging;
using evanbecker_api.Configuration;
using evanbecker_api.Extensions;
using evanbecker_api.Services.Interfaces;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.Extensions.Options;

namespace evanbecker_api.Services;

public class UserService : IUserService
{
    private readonly ApplicationContext _context;
    private readonly IOptions<Auth0Configuration> _auth0Configuration;

    public UserService(ApplicationContext context,
        IOptions<Auth0Configuration> auth0Configuration)
    {
        _context = context;
        _auth0Configuration = auth0Configuration;
    }
    
    public async Task<User?> GetUser(ClaimsPrincipal claimsUser)
    {
        var authId = claimsUser?.GetAuthId();
        if (authId == null)
            return null;
        var user = await _context
            .Users
            .SingleOrDefaultAsync(x => x.Auth0Id == authId);
        if (user != null)
            return user;
        
        var authClient = new AuthenticationApiClient(_auth0Configuration.Value.Domain);
        var authToken = await authClient.GetTokenAsync(new ClientCredentialsTokenRequest
        {
            Audience = $"https://{_auth0Configuration.Value.Domain}/api/v2/",
            ClientId = _auth0Configuration.Value.ClientId,
            ClientSecret = _auth0Configuration.Value.ClientSecret
        });

        // TODO: Move to some sort of Auth0Service
        var managementClient = new ManagementApiClient(authToken.AccessToken, _auth0Configuration.Value.Domain);
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

        var savedUser = await _context.Users.AddAsync(newUser);
        await _context.SaveChangesAsync();

        return savedUser.Entity;
    }
}