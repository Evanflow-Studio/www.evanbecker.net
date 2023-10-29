using System.Net.NetworkInformation;
using evanbecker_api.Dto;
using evanbecker_api.Services.Interfaces;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;
using Environment = evanbecker_domain.Entities.Environment;

namespace evanbecker_api.Services;

public class ProjectService : IProjectService
{
    private readonly ApplicationContext _context;

    public ProjectService(ApplicationContext context)
    {
        _context = context;
    }
    
    public Task<List<Project>> GetAllProjectsAsync()
    {
        return _context.Projects.ToListAsync();
    }

    public async Task<Project?> GetProjectAsync(Guid projectId)
    {
        var project = await _context
            .Projects
            .Include(x => x.Environments)
            .Include(x => x.EnvironmentUrls)
            .Include(x => x.Members)
            .Include(x => x.Photos)
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        if (project == null)
            return null;
        project.ActivityLogs = project.ActivityLogs.OrderBy(x => x.Created);
        return project;
    }

    public async Task<Project?> UpdateProjectNameAsync(User user, Guid projectId, string projectName)
    {
        var foundProject = await _context.Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;

        foundProject.Name = projectName;
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user,
            ActivityLogType.ChangeRepository,
            $"changed the project name to '{projectName}'."));
        foundProject.ActivityLogs = tempLog;
        
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return foundProject;
    }

    public async Task<Project?> CreateAsync(User user, string projectName)
    {
        var newProject = new Project
        {
            Name = projectName,
            Members = new List<User> { user },
            Repository = string.Empty,
            
            Created = DateTime.Now.ToUniversalTime(),
            Updated = DateTime.Now.ToUniversalTime(),
            
            NotifyOnMembers = false,
            NotifyOnPhotos = false,
            NotifyOnComments = false,
            NotifyRecipients = null,
            ActivityLogs = new List<ActivityLog>
            {
                new ()
                {
                    User = user,
                    Text = "created the project.",
                    Type = ActivityLogType.CreateProject,
                    IsDeleted = false,
                    Created = DateTime.Now.ToUniversalTime(),
                }
            },
            
            Environments = new List<Environment>(),
            EnvironmentUrls = new List<EnvironmentUrl>(),
            Commits = new List<Commit>(),
            EmailSubscribers = new List<EmailSubscriber>(),
            Deployments = new List<Deployment>(),
            Photos = new List<Photo>(),
        };

        var project = await _context.Projects.AddAsync(newProject);
        await _context.SaveChangesAsync();
        return project.Entity;
    }

    public async Task<Project?> UpdateRepositoryNameAsync(User user, Guid projectId, string repositoryName)
    {
        var foundProject = await _context.Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;
        
        foundProject.Repository = repositoryName;
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user,
            ActivityLogType.ChangeRepository,
            $"changed the repository to '{repositoryName}'."));
        foundProject.ActivityLogs = tempLog;
        
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return foundProject;
    }

    public async Task<Project?> UpdateEnvironmentsAsync(User user, Guid projectId, IEnumerable<EnvironmentDto> environments)
    {
        var foundProject = await _context.Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .Include(x => x.Environments)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;

        foreach (var environment in environments)
        {
            if (environment.Id == null)
            {
                // new, add
                var tempList = foundProject.Environments.ToList();
                tempList.Add(new Environment
                {
                    Created = DateTime.Now.ToUniversalTime(),
                    Updated = DateTime.Now.ToUniversalTime(),
                    Name = environment.Name,
                    IsDeleted = environment.IsDeleted,
                });
                foundProject.Environments = tempList;
            }
            else
            {
                // update
                var foundEnvironment = foundProject.Environments.SingleOrDefault(x => x.Id == environment.Id);
                if (foundEnvironment == null)
                    return null;
                foundEnvironment.Name = environment.Name;
                foundEnvironment.IsDeleted = environment.IsDeleted;
                foundEnvironment.Updated = DateTime.Now.ToUniversalTime();
            }
        }
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user,
            ActivityLogType.ChangeEnvironmentUrl,
            "modified environments."));
        foundProject.ActivityLogs = tempLog;

        var project = _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return project.Entity;
    }

    public async Task AddEmailSubscriberAsync(Guid projectId, string emailAddress)
    {
        var foundProject = await _context.Projects
            .Include(x => x.EmailSubscribers)
            .SingleOrDefaultAsync(x => x.Id == projectId);

        if (foundProject == null)
            return;

        var tempEmails = foundProject.EmailSubscribers.ToList();
        tempEmails.Add(new EmailSubscriber{ EmailAddress = emailAddress });
        foundProject.EmailSubscribers = tempEmails;
        
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
    }

    public async Task<Project?> UpdateEnvironmentUrlsAsync(User user, Guid projectId, IEnumerable<EnvironmentUrlDto> environmentUrls)
    {
        var foundProject = await _context.Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .Include(x => x.Environments)
            .Include(x => x.EnvironmentUrls)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;

        foreach (var environmentUrl in environmentUrls)
        {
            if (foundProject.Environments.All(x => x.Id != environmentUrl.EnvironmentId))
            {
                return null;
            }
            
            if (environmentUrl.Id == null)
            {
                // new, add
                var tempList = foundProject.EnvironmentUrls.ToList();
                tempList.Add(new EnvironmentUrl
                {
                    Created = DateTime.Now.ToUniversalTime(),
                    Updated = DateTime.Now.ToUniversalTime(),
                    Name = environmentUrl.Name,
                    Url = environmentUrl.Url,
                    EnvironmentId = environmentUrl.EnvironmentId,
                    IsDeleted = environmentUrl.IsDeleted,
                });
                foundProject.EnvironmentUrls = tempList;
            }
            else
            {
                // update
                var foundEnvironment = foundProject.EnvironmentUrls.SingleOrDefault(x => x.Id == environmentUrl.Id);
                if (foundEnvironment == null)
                    return null;
                foundEnvironment.Name = environmentUrl.Name;
                foundEnvironment.Url = environmentUrl.Url;
                foundEnvironment.EnvironmentId = environmentUrl.EnvironmentId;
                foundEnvironment.IsDeleted = environmentUrl.IsDeleted;
                foundEnvironment.Updated = DateTime.Now.ToUniversalTime();
            }
        }
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user,
            ActivityLogType.ChangeEnvironmentUrl,
            "modified environment urls."));
        foundProject.ActivityLogs = tempLog;

        var project = _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return project.Entity;
    }

    public async Task<Project?> UpdateNotificationsAsync(User user, Guid projectId, NotificationDto notification)
    {
        var foundProject = await _context
            .Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;
        
        foundProject.NotifyOnComments = notification.NotifyOnComments;
        foundProject.NotifyOnMembers = notification.NotifyOnMembers;
        foundProject.NotifyOnPhotos = notification.NotifyOnPhotos;
        foundProject.NotifyRecipients = notification.NotifyRecipients;
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user,
            ActivityLogType.ChangeNotifications,
            "modified notification settings."));
        foundProject.ActivityLogs = tempLog;
            
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return foundProject;
    }

    public async Task<Project?> CreateProjectCommentAsync(User user, Guid projectId, string commentText)
    {
        var foundProject = await _context
            .Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user, ActivityLogType.Comment, commentText));
        foundProject.ActivityLogs = tempLog;
            
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return foundProject;
    }

    public async Task<Project?> AddPhotoAsync(User user, Guid projectId, PhotoDto photo)
    {
        var foundProject = await _context
            .Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .Include(x => x.Photos)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (foundProject == null)
            return null;
        
        var tempPhotos = foundProject.Photos.ToList();
        tempPhotos.Add(new Photo
        {
            Base64 = photo.Base64,
            Created = DateTime.Now.ToUniversalTime(),
            IsDeleted = photo.IsDeleted,
            Size = photo.Size,
            Updated = DateTime.Now.ToUniversalTime(),
            FileName = photo.FileName
        });
        foundProject.Photos = tempPhotos;
        
        var tempLog = foundProject.ActivityLogs.ToList();
        tempLog.Add(CreateActivityLog(user, ActivityLogType.AddPhoto, "added a photo."));
        foundProject.ActivityLogs = tempLog;
            
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
        return foundProject;
    }

    public async Task SyncProjectDeploymentsAndCommitsAsync(Guid projectId, List<Deployment> deployments, List<Commit> projectCommits)
    {
        var foundProject = await _context
            .Projects
            .Include(x => x.ActivityLogs)
            .ThenInclude(x => x.User)
            .Include(x => x.Deployments)
            .Include(x => x.Commits)
            .SingleOrDefaultAsync(x => x.Id == projectId);

        if (foundProject == null)
            throw new ArgumentException("Not a valid project");

        foundProject.Commits = projectCommits;
        foundProject.Deployments = deployments;
        
        _context.Projects.Update(foundProject);
        await _context.SaveChangesAsync();
    }

    public async Task<PagedDto<Deployment>> GetDeploymentsPagedAsync(Guid projectId, int page, int pageSize = 10)
    {
        var foundProject = await _context
            .Projects
            .Include(x => x.Deployments.OrderByDescending(y => y.Created).Skip((page-1)*pageSize).Take(pageSize))
            .SingleOrDefaultAsync(x => x.Id == projectId);

        var count = await _context.Entry(foundProject).Collection(d => d.Deployments).Query().CountAsync();

        return new PagedDto<Deployment>
        {
            Results = foundProject?.Deployments,
            Page = page,
            Total = count,
            TotalPages = (int)Math.Ceiling((double)count / pageSize)
        };
    }

    public async Task<PagedDto<Commit>> GetCommitsPagedAsync(Guid projectId, int page, int pageSize = 4)
    {
        var foundProject = await _context
            .Projects
            .Include(x => x.Commits.OrderByDescending(y => y.Created).Skip((page-1)*pageSize).Take(pageSize))
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        var count = await _context.Entry(foundProject).Collection(d => d.Commits).Query().CountAsync();

        return new PagedDto<Commit>
        {
            Results = foundProject?.Commits,
            Page = page,
            Total = count,
            TotalPages = (int)Math.Ceiling((double)count / pageSize)
        };
    }

    public async Task<ProjectDashboardDto?> GetProjectDashboardMetricsAsync()
    {
        var projects = await _context
            .Projects
            .Include(x => x.Environments)
            .Include(x => x.EnvironmentUrls)
            .Include(x => x.Deployments)
            .ToListAsync();

        if (projects?.Any() != true)
            return null;

        var deploymentDtos = new List<DeploymentDto>();
        var cards = new List<ProjectDashboardCardDto>();
        
        foreach (var project in projects)
        {
            var currentDtos = project.Deployments.Select(deployment => new DeploymentDto
                {
                    Created = deployment.Created,
                    Branch = deployment.Branch,
                    Conclusion = deployment.Conclusion,
                    Duration = deployment.Duration,
                    Sha = deployment.Sha,
                    AssociatedProject = project.Name,
                    UserAvatar = deployment.UserAvatar,
                    UserLogin = deployment.UserLogin,
                    UserUrl = deployment.UserUrl
                })
                .ToList();

            var successes = currentDtos.Count(x => x.Conclusion == "Success");
            var total = currentDtos.Count;
            var totalDuration = currentDtos
                .Aggregate(TimeSpan.Zero, (current, dto) => current.Add(TimeSpan.Parse(dto.Duration ?? "00:00:00")));
            var averageDuration = totalDuration.TotalMinutes / total;

            var card = new ProjectDashboardCardDto
            {
                Type = "Website",
                EnvironmentNames = project.Environments.Select(x => x.Name).ToList(),
                IsActive = true,
                ProjectName = project.Name,
                PipelineSuccessRate = $"{((float)successes / total)*100:0.00}",
                NumberOfDomains = project.EnvironmentUrls.Count().ToString(),
                NumberOfPipelineRuns = total.ToString(),
                AveragePipelineTime = $"{(float)averageDuration:0.00}"
            };
            
            cards.Add(card);
            deploymentDtos.AddRange(currentDtos);
        }

        var dashboardItem = new ProjectDashboardDto
        {
            LatestDeployments = deploymentDtos.Take(7).ToList(),
            DashboardCards = cards,
        };

        dashboardItem.LatestDeployments = dashboardItem.LatestDeployments.OrderByDescending(x => x.Created).ToList();

        return dashboardItem;
    }

    public async Task<IEnumerable<HealthCheckDto>?> GetHealthCheckAsync(Guid projectId, bool onlyProd = false)
    {
        var project = await _context
            .Projects
            .Include(x => x.Environments)
            .Include(x => x.EnvironmentUrls)
            .SingleOrDefaultAsync(x => x.Id == projectId);
        
        if (project == null)
            return null;
        
        var ping = new Ping();
        var healthChecks = new List<HealthCheckDto>();
        foreach (var envUrl in project.EnvironmentUrls.Where(x => !x.IsDeleted))
        {
            HealthCheckDto dto;
            try
            {
                var result = await ping.SendPingAsync($"{envUrl.Url}", 250);
                dto = new HealthCheckDto
                {
                    Environment = project.Environments
                        .SingleOrDefault(y => y.Id == envUrl.EnvironmentId)?
                        .Name ?? string.Empty,
                    Created = envUrl.Created,
                    Name = envUrl.Name ?? string.Empty,
                    Url = envUrl.Url ?? string.Empty,
                    Status = result.Status == IPStatus.Success ? "Success" : "Unavailable"
                };
            }
            catch (Exception)
            {
                dto = new HealthCheckDto
                {
                    Environment = project.Environments
                        .SingleOrDefault(y => y.Id == envUrl.EnvironmentId)?
                        .Name ?? string.Empty,
                    Created = envUrl.Created,
                    Name = envUrl.Name ?? string.Empty,
                    Url = envUrl.Url ?? string.Empty,
                    Status = "Failure"
                };
            }

            healthChecks.Add(dto);
        }

        healthChecks = healthChecks.OrderBy(x => x.Environment).ToList();

        if (onlyProd)
        {
            healthChecks = healthChecks
                .Where(x => x.Environment is "Prod" or "prod" or "Production" or "production")
                .ToList();
        }

        return healthChecks;
    }
    
    public async Task<IEnumerable<HealthCheckDto>?> GetMainHealthCheckAsync()
    {
        var project = await _context
            .Projects
            .SingleOrDefaultAsync(x => x.Name == "www.evanbecker.net");

        if (project == null)
            return null;

        return await GetHealthCheckAsync(project.Id, false);
    }

    public async Task<PagedDto<Deployment>> GetAllDeploymentsPagedAsync(int page, int pageSize = 8)
    {
        var flattenedDeployments = _context
            .Projects
            .Include(x => x.Deployments)
            .SelectMany(x => x.Deployments)
            .OrderByDescending(y => y.Created)
            .Skip((page-1)*pageSize).Take(pageSize);

        var count = await flattenedDeployments.CountAsync();

        return new PagedDto<Deployment>
        {
            Results = flattenedDeployments,
            Page = page,
            Total = count,
            TotalPages = (int)Math.Ceiling((double)count / pageSize)
        };
    }

    private static ActivityLog CreateActivityLog(User user, ActivityLogType type, string message)
    {
        return new ActivityLog
        {
            Created = DateTime.Now.ToUniversalTime(),
            IsDeleted = false,
            Text = message,
            Type = type,
            User = user
        };
    }
}