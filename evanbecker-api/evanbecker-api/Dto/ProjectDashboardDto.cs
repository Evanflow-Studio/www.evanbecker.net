using evanbecker_domain.Entities;

namespace evanbecker_api.Dto;

public class ProjectDashboardDto
{
    public IList<ProjectDashboardCardDto> DashboardCards { get; set; }
    public IList<DeploymentDto> LatestDeployments { get; set; }
}

public class ProjectDashboardCardDto
{
    public string? ProjectName { get; set; }
    public string? Type { get; set; }
    public List<string?> EnvironmentNames { get; set; }
    public string NumberOfPipelineRuns { get; set; }
    public string AveragePipelineTime { get; set; }
    public string NumberOfDomains { get; set; }
    public string PipelineSuccessRate { get; set; }
    public bool IsActive { get; set; }
}

public class DeploymentDto
{
    public string UserUrl { get; set; }
    public string UserAvatar { get; set; }
    public string UserLogin { get; set; }
    public string Sha { get; set; }
    public string Branch { get; set; }
    public string? Conclusion { get; set; }
    public string? Duration { get; set; }
    public DateTime Created { get; set; }
    public string? AssociatedProject { get; set; }
}