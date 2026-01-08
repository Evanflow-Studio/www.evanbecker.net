using evanbecker_domain.Entities;

namespace evanbecker_api.Dto;

public class ProjectDashboardDto
{
    public required IList<ProjectDashboardCardDto> DashboardCards { get; set; }
    public required IList<DeploymentDto> LatestDeployments { get; set; }
}

public class ProjectDashboardCardDto
{
    public required string? ProjectName { get; set; }
    public required string? Type { get; set; }
    public required List<string?> EnvironmentNames { get; set; }
    public required string NumberOfPipelineRuns { get; set; }
    public required string AveragePipelineTime { get; set; }
    public required string NumberOfDomains { get; set; }
    public required string PipelineSuccessRate { get; set; }
    public required bool IsActive { get; set; }
}

public class DeploymentDto
{
    public required string UserUrl { get; set; }
    public required string UserAvatar { get; set; }
    public required string UserLogin { get; set; }
    public required string Sha { get; set; }
    public required string Branch { get; set; }
    public required string? Conclusion { get; set; }
    public required string? Duration { get; set; }
    public required DateTime Created { get; set; }
    public required string? AssociatedProject { get; set; }
}