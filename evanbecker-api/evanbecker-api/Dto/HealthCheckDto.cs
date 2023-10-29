namespace evanbecker_api.Dto;

public class HealthCheckDto
{
    public string Status { get; set; }
    public string Url { get; set; }
    public string Environment { get; set; }
    public string Name { get; set; }
    public DateTime Created { get; set;}
}