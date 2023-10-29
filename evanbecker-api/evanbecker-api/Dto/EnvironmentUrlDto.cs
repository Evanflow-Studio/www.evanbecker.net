namespace evanbecker_api.Dto;

public class EnvironmentUrlDto
{
    public Guid? Id { get; set; }
    public string? Name { get; set; }
    public string? Url { get; set; }
    public bool IsDeleted { get; set; }
}