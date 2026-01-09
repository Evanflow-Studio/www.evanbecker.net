namespace evanbecker_api.Dto;

public class HealthCheckDto
{
    public required string Status { get; set; }
    public required string Url { get; set; }
    public required string Environment { get; set; }
    public required string Name { get; set; }
    public required DateTime Created { get; set;}
}