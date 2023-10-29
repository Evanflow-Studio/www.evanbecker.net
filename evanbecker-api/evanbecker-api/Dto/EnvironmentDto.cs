namespace evanbecker_api.Dto;

public class EnvironmentDto
{
    public Guid? Id { get; set; }
    public string? Name { get; set; }
    
    public bool IsDeleted { get; set; }
}