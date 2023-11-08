using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace evanbecker_domain.Entities;

public class Project
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public IEnumerable<User>? Members { get; set; }
    //public IEnumerable<User>? Following { get; set; }
    
    public string? Repository { get; set; }
    public IEnumerable<Environment> Environments { get; set; }
    public IEnumerable<EnvironmentUrl> EnvironmentUrls { get; set; }
    public IEnumerable<Photo> Photos { get; set; }
    public IEnumerable<ActivityLog> ActivityLogs { get; set; }
    public IEnumerable<Deployment> Deployments { get; set; }
    public IEnumerable<Commit> Commits { get; set; }
    
    public IEnumerable<EmailSubscriber> EmailSubscribers { get; set; }

    public bool NotifyOnComments { get; set; }
    public bool NotifyOnMembers { get; set; }
    public bool NotifyOnPhotos { get; set; }
    public string? NotifyRecipients { get; set; }
    
    public string? ProjectType { get; set; }

    public DateTime Created { get; set; }
    public DateTime Updated { get; set; }
}

public enum ActivityLogType
{
    Comment=0,
    CreateProject=1,
    EditProjectName=2,
    ChangeEnvironment=3,
    ChangeEnvironmentUrl=4,
    ChangeRepository=5,
    ChangeNotifications=6,
    AddMember=7,
    AddPhoto=8,
    Deployment=9,
    Synced=10,
    ChangeProjectType=11,
}

public class EmailSubscriber
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public string EmailAddress { get; set; }
}

public class Deployment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    public string UserUrl { get; set; }
    public string UserAvatar { get; set; }
    public string UserLogin { get; set; }
    
    public string Sha { get; set; }
    public string Branch { get; set; }
    public string? Conclusion { get; set; }
    public string? Duration { get; set; }
    public DateTime Created { get; set; }
}

public class ServiceHealthCheck
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public bool Success { get; set; }
    public string Environment { get; set; }
    public string UrlName { get; set; }
    public string Url { get; set; }
    public DateTime Created { get; set; }
}

public class Commit
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    public string UserUrl { get; set; } // Author.HtmlUrl
    public string UserAvatar { get; set; } // Author.AvatarUrl
    public string UserLogin { get; set; } // Author.Login
    
    public string Message { get; set; } // Commit.Message
    
    public string? Sha { get; set; } // Sha
    public DateTime Created { get; set; } // Commit.Author.Date
}

public class ActivityLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public bool IsDeleted { get; set; }
    public ActivityLogType Type { get; set; }
    public User? User { get; set; }
    public string? Text { get; set; }
    public DateTime Created { get; set; }
}

public class Photo
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public bool IsDeleted { get; set; }
    public string? FileName { get; set; }
    public string? Size { get; set; }
    public string? Base64 { get; set; }
    public DateTime Created { get; set; }
    public DateTime Updated { get; set; }
}

public class Environment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime Created { get; set; }
    public DateTime Updated { get; set; }
}

public class EnvironmentUrl
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public Guid? EnvironmentId { get; set; }
    public string? Url { get; set; }
    public string? Name { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime Created { get; set; }
    public DateTime Updated { get; set; }
}