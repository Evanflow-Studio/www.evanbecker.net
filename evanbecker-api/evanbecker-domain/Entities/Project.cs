using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace evanbecker_domain.Entities;

public class Project
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? DeploymentNote { get; set; }
    public IEnumerable<User>? Members { get; set; }
    public IEnumerable<User>? Following { get; set; }
    public ProjectPrivacySetting PrivacySetting { get; set; }
    public DeployStatus DeployStatus { get; set; }
    public string? Version { get; set; }
    public DateTime Created { get; set; }
    public DateTime Updated { get; set; }
}

public enum DeployStatus
{
    Success,
    Failure,
    Idle
}

public enum ProjectPrivacySetting
{
    PublicAccess,
    PrivateToMembers,
    PrivateToYou
}