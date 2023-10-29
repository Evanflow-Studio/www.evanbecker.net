namespace evanbecker_api.Configuration;

public class Auth0Configuration
{
    public string? Domain { get; set; }

    public string? Audience { get; set; }

    public string? ClientId { get; set; }

    public string? ClientSecret { get; set; }
    
    public string? Url { get; set; }
}

public class GitHubConfiguration
{
    public string? Pat { get; set; }
    public string? Organization { get; set; }
}