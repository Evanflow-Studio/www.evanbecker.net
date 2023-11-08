using evanbecker_api.Dto;
using evanbecker_api.Services.Interfaces;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/project")]
public class ProjectController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IProjectService _projectService;

    public ProjectController(IUserService userService, IProjectService projectService)
    {
        _userService = userService;
        _projectService = projectService;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAllProjects()
    {
        var projects = await _projectService.GetAllProjectsAsync();
        return Ok(projects);
    }

    [HttpGet("{projectId:guid}")]
    public async Task<IActionResult> GetProject(Guid projectId)
    {
        var project = await _projectService.GetProjectAsync(projectId);
        if (project == null)
            return NotFound();
        return Ok(project);
    }

    [Authorize]
    [HttpPost("new/{projectName}")]
    public async Task<IActionResult> CreateProject(string projectName)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.CreateAsync(user, projectName);
        if (project == null)
            return NotFound();
        return Ok(project);
    }

    [Authorize]
    [HttpPatch("{projectId:guid}/name/{projectName}")]
    public async Task<IActionResult> UpdateProjectName(Guid projectId, string projectName)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.UpdateProjectNameAsync(user, projectId, projectName);
        if (project == null)
            return NotFound();
        return Ok(project);
    }
    
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        var metrics = await _projectService.GetProjectDashboardMetricsAsync();
        return Ok(metrics);
    }
    
    [HttpGet("healthcheck")]
    public async Task<IActionResult> GetMainHealthCheck()
    {
        var healthCheck = await _projectService.GetMainHealthCheckAsync();
        return Ok(healthCheck);
    }
    
    [HttpGet("{projectId:guid}/healthcheck")]
    public async Task<IActionResult> GetHealthCheck(Guid projectId)
    {
        var healthCheck = await _projectService.GetHealthCheckAsync(projectId);
        return Ok(healthCheck);
    }
    
    [HttpPost("{projectId:guid}/email")]
    public async Task<IActionResult> AddSubscriberEmail(Guid projectId, [FromBody]string emailAddress)
    {
        await _projectService.AddEmailSubscriberAsync(projectId, emailAddress);
        return Ok();
    }
    
    [HttpGet("deployments/all/page/{page:int}")]
    public async Task<IActionResult> GetAllDeployments(int page)
    {
        var deployments = await _projectService.GetAllDeploymentsPagedAsync(page);
        return Ok(deployments);
    }
    
    [HttpGet("{projectId:guid}/deployments/page/{page:int}")]
    public async Task<IActionResult> GetDeployments(Guid projectId, int page)
    {
        var deployments = await _projectService.GetDeploymentsPagedAsync(projectId, page);
        return Ok(deployments);
    }
    
    [HttpGet("{projectId:guid}/commits/page/{page:int}")]
    public async Task<IActionResult> GetCommits(Guid projectId, int page)
    {
        var commits = await _projectService.GetCommitsPagedAsync(projectId, page);
        return Ok(commits);
    }
    
    [HttpGet("{projectId:guid}/commits/page/{page:int}/{pageSize:int}")]
    public async Task<IActionResult> GetCommits(Guid projectId, int page, int pageSize)
    {
        var commits = await _projectService.GetCommitsPagedAsync(projectId, page, pageSize);
        return Ok(commits);
    }
    
    [Authorize]
    [HttpPatch("{projectId:guid}/repository/{repositoryName}")]
    public async Task<IActionResult> UpdateRepositoryName(Guid projectId, string repositoryName)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.UpdateRepositoryNameAsync(user, projectId, repositoryName);
        if (project == null)
            return NotFound();
        return Ok(project);
    }
    
    [Authorize]
    [HttpPatch("{projectId:guid}/environments")]
    public async Task<IActionResult> UpdateEnvironments(Guid projectId, IEnumerable<EnvironmentDto> environments)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.UpdateEnvironmentsAsync(user, projectId, environments);
        if (project == null)
            return NotFound();
        return Ok(project);
    }
    
    [Authorize]
    [HttpPatch("{projectId:guid}/environmentsUrls")]
    public async Task<IActionResult> UpdateEnvironmentsUrls(Guid projectId, IEnumerable<EnvironmentUrlDto> environmentUrls)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.UpdateEnvironmentUrlsAsync(user, projectId, environmentUrls);
        if (project == null)
            return NotFound();
        return Ok(project);
    }
    
    [Authorize]
    [HttpPatch("{projectId:guid}/photo")]
    public async Task<IActionResult> AddPhoto(Guid projectId, PhotoDto photo)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.AddPhotoAsync(user, projectId, photo);
        if (project == null)
            return NotFound();
        project.Photos = project.Photos.OrderBy(x => x.Created);
        return Ok(project);
    }
    
    /*[HttpDelete("{projectId:guid}/photo/{photoId:guid}")]
    public async Task<IActionResult> DeletePhoto(Guid projectId, Guid photoId)
    {
        
    }*/

    [Authorize]
    [HttpPost("{projectId:guid}/comment/{commentText}")]
    public async Task<IActionResult> CreateComment(Guid projectId, string commentText)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.CreateProjectCommentAsync(user, projectId, commentText);
        if (project == null)
            return NotFound();
        project.ActivityLogs = project.ActivityLogs.OrderBy(x => x.Created);
        return Ok(project);
    }
    
    [Authorize]
    [HttpPatch("{projectId:guid}/type/{projectType}")]
    public async Task<IActionResult> UpdateProjectType(Guid projectId, string projectType)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.UpdateProjectTypeAsync(user, projectId, projectType);
        if (project == null)
            return NotFound();
        return Ok(project);
    }
    
    [Authorize]
    [HttpPatch("{projectId:guid}/notifications")]
    public async Task<IActionResult> UpdateNotifications(Guid projectId, NotificationDto notification)
    {
        var user = await _userService.GetUser(User);
        if (user == null)
            return Forbid();
        var project = await _projectService.UpdateNotificationsAsync(user, projectId, notification);
        if (project == null)
            return NotFound();
        return Ok(project);
    }
}