using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Auth0.ManagementApi.Paging;
using evanbecker_api.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Octokit;

namespace evanbecker_api.Controllers;

[Route("[controller]/[action]")]
public class AuthController : ControllerBase
{

    public IOptions<Auth0Configuration> _auth0Configuration;
    private readonly IOptions<GitHubConfiguration> _gitHubConfiguration;
    private readonly IConfiguration _configuration;

    public AuthController(IOptions<Auth0Configuration> auth0Configuration, IOptions<GitHubConfiguration> gitHubConfiguration)
    {
        _auth0Configuration = auth0Configuration;
        _gitHubConfiguration = gitHubConfiguration;
    }

    [Authorize]
    [HttpGet]
    public async Task<IPagedList<Auth0.ManagementApi.Models.User>> GetUsers()
    {
        var authClient = new AuthenticationApiClient(_auth0Configuration.Value.Domain);
        var authToken = await authClient.GetTokenAsync(new ClientCredentialsTokenRequest
        {
            Audience = $"https://{_auth0Configuration.Value.Domain}/api/v2/",
            ClientId = _auth0Configuration.Value.ClientId,
            ClientSecret = _auth0Configuration.Value.ClientSecret
        });

        var managementClient = new ManagementApiClient(authToken.AccessToken, _auth0Configuration.Value.Domain);
        var data = await managementClient.Users.GetAllAsync(new Auth0.ManagementApi.Models.GetUsersRequest(), new PaginationInfo(0, 10, true));

        return data;
    }

    // wip FOR PROJECTS
    [HttpGet]
    public async Task Test()
    {
        var client = new GitHubClient(new ProductHeaderValue(_gitHubConfiguration.Value.Organization));
        var tokenAuth = new Credentials(_gitHubConfiguration.Value.Pat); // This can be a PAT or an OAuth token.
        client.Credentials = tokenAuth;
        var myList = await client.Actions.Workflows.Runs.List(_gitHubConfiguration.Value.Organization, "www.evanbecker.net");
        var myList2 = await client.Repository.Commit.GetAll(_gitHubConfiguration.Value.Organization, "www.evanbecker.net");
        var myList3 = await client.Actions.SelfHostedRunners.ListAllRunnersForOrganization(_gitHubConfiguration.Value.Organization);
    }
}