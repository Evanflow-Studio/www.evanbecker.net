namespace evanbecker_api.Dto;

public class NewsLetterEntryDto
{
    public required string EmailAddress { get; set; }

    /// <summary>The reCAPTCHA v3 token for the action <c>newsletter</c>.</summary>
    public string? RecaptchaToken { get; set; }
}