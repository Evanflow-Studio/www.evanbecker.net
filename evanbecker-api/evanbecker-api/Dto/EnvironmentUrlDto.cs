namespace evanbecker_api.Dto;

public class EnvironmentUrlDto
{
    public Guid? Id { get; set; }
    public Guid? EnvironmentId { get; set; }
    public string? Name { get; set; }
    public string? Url { get; set; }
    public bool IsDeleted { get; set; }
}

public class PhotoDto
{
    public Guid? Id { get; set; }
    public bool IsDeleted { get; set; }
    public string? FileName { get; set; }
    public string? Size { get; set; }
    public string? Base64 { get; set; }
}

public class NotificationDto
{
    public bool NotifyOnComments { get; set; }
    public bool NotifyOnMembers { get; set; }
    public bool NotifyOnPhotos { get; set; }
    public string? NotifyRecipients { get; set; }
}