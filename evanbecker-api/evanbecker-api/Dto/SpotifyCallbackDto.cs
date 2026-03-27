namespace evanbecker_api.Dto;

public class SpotifyCallbackDto
{
    public string Code { get; set; } = "";
}

public class SpotifyRefreshDto
{
    public string RefreshToken { get; set; } = "";
}
