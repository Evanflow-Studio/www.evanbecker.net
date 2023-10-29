using evanbecker_api.Dto;
using evanbecker_domain.Entities;

namespace evanbecker_api.Services.Interfaces;

public interface IProjectService
{
    Task<List<Project>> GetAllProjectsAsync();
    Task<Project?> GetProjectAsync(Guid projectId);
    Task<Project?> UpdateProjectNameAsync(User user, Guid projectId, string projectName);
    Task<Project?> CreateAsync(User user, string projectName);
    Task<Project?> UpdateRepositoryNameAsync(User user, Guid projectId, string repositoryName);
    Task<Project?> UpdateEnvironmentsAsync(User user, Guid projectId, IEnumerable<EnvironmentDto> environments);
    Task<Project?> UpdateEnvironmentUrlsAsync(User user, Guid projectId, IEnumerable<EnvironmentUrlDto> environmentUrls);
    Task<Project?> UpdateNotificationsAsync(User user, Guid projectId, NotificationDto notification);
    Task<Project?> CreateProjectCommentAsync(User user, Guid projectId, string commentText);
    Task<Project?> AddPhotoAsync(User user, Guid projectId, PhotoDto photo);
    Task SyncProjectDeploymentsAndCommitsAsync(Guid projectId, List<Deployment> deployments, List<Commit> projectCommits);
    Task<PagedDto<Deployment>> GetDeploymentsPagedAsync(Guid projectId, int page, int pageSize = 10);
    Task<PagedDto<Deployment>> GetAllDeploymentsPagedAsync(int page, int pageSize = 8);
    Task<PagedDto<Commit>> GetCommitsPagedAsync(Guid projectId, int page, int pageSize = 4);
    Task<ProjectDashboardDto?> GetProjectDashboardMetricsAsync();
    Task<IEnumerable<HealthCheckDto>?> GetHealthCheckAsync(Guid projectId, bool onlyProd = false);
    Task<IEnumerable<HealthCheckDto>?>  GetMainHealthCheckAsync();
    Task AddEmailSubscriberAsync(Guid projectId, string emailAddress);
}