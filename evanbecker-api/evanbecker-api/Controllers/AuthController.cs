using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Auth0.ManagementApi.Paging;
using evanbecker_api.Configuration;
using evanbecker_api.Services.Interfaces;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Octokit;
using Commit = evanbecker_domain.Entities.Commit;
using Deployment = evanbecker_domain.Entities.Deployment;

namespace evanbecker_api.Controllers;

[Route("[controller]/[action]")]
public class AuthController : ControllerBase
{

    public IOptions<Auth0Configuration> _auth0Configuration;
    private readonly IOptions<GitHubConfiguration> _gitHubConfiguration;
    private readonly IProjectService _projectService;
    private readonly IConfiguration _configuration;

    public AuthController(IOptions<Auth0Configuration> auth0Configuration,
        IOptions<GitHubConfiguration> gitHubConfiguration,
        IProjectService projectService)
    {
        _auth0Configuration = auth0Configuration;
        _gitHubConfiguration = gitHubConfiguration;
        _projectService = projectService;
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

        var projects = await _projectService.GetAllProjectsAsync();

        foreach (var project in projects)
        {
            if (project.Repository == null)
                continue;
            var workflows = await client.Actions.Workflows.Runs.List(_gitHubConfiguration.Value.Organization, project.Repository);
            var commits = await client.Repository.Commit.GetAll(_gitHubConfiguration.Value.Organization, project.Repository);

            var deployments = workflows.WorkflowRuns.Select(run => new Deployment
                {
                    UserUrl = run.Actor.HtmlUrl,
                    UserAvatar = run.Actor.AvatarUrl,
                    UserLogin = run.Actor.Login,
                    Sha = run.HeadSha,
                    Branch = run.HeadBranch,
                    Conclusion = run.Conclusion?.Value switch
                    {
                        WorkflowRunConclusion.Cancelled => "Cancelled",
                        WorkflowRunConclusion.Failure => "Failure",
                        WorkflowRunConclusion.Success => "Success",
                        WorkflowRunConclusion.Neutral => "Neutral",
                        WorkflowRunConclusion.Skipped => "Skipped",
                        WorkflowRunConclusion.Stale => "Stale",
                        WorkflowRunConclusion.ActionRequired => "ActionRequired",
                        WorkflowRunConclusion.StartupFailure => "StartupFailure",
                        WorkflowRunConclusion.TimedOut => "TimedOut",
                        _ => throw new ArgumentOutOfRangeException()
                    },
                    Duration = (run.UpdatedAt - run.RunStartedAt).Duration().ToString(),
                    Created = run.RunStartedAt.UtcDateTime
                })
                .ToList();

            var projectCommits = commits?
                .Where(x => x != null)
                .Select(commit => new Commit
            {
                UserUrl = commit?.Author?.HtmlUrl ?? "#",
                UserAvatar = commit?.Author?.AvatarUrl ?? string.Empty,
                UserLogin = commit?.Author?.Login ?? string.Empty,
                Message = commit?.Commit?.Message ?? string.Empty,
                Sha = commit?.Sha ?? string.Empty,
                Created = commit?.Commit?.Author?.Date.UtcDateTime ?? DateTime.MinValue
            }).ToList();

            await _projectService.SyncProjectDeploymentsAndCommitsAsync(project.Id, deployments, projectCommits);
        }
    }
}