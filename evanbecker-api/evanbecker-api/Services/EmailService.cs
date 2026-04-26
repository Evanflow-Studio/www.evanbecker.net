using System.Net.Http.Json;
using evanbecker_domain.Entities;
using Microsoft.Extensions.Options;

namespace evanbecker_api.Services;

public class EmailSettings
{
    public string ApiKey { get; set; } = "";
    public string FromAddress { get; set; } = "noreply@evanbecker.net";
    public string FromName { get; set; } = "evanbecker.net";
    public string ToAddress { get; set; } = "";
}

public interface IEmailService
{
    Task SendContactNotificationAsync(ContactMessage message);
    Task SendNewsletterSubscriptionNotificationAsync(string subscriberEmail);
}

public class EmailService(
    IOptions<EmailSettings> settings,
    HttpClient httpClient,
    ILogger<EmailService> logger) : IEmailService
{
    private const string Smtp2GoEndpoint = "https://api.smtp2go.com/v3/email/send";
    private readonly EmailSettings _settings = settings.Value;

    public async Task SendContactNotificationAsync(ContactMessage message)
    {
        if (string.IsNullOrEmpty(_settings.ApiKey) || string.IsNullOrEmpty(_settings.ToAddress))
        {
            logger.LogWarning("SMTP2Go not configured (missing API key or recipient), skipping contact notification.");
            return;
        }

        var body = new
        {
            api_key = _settings.ApiKey,
            to = new[] { $"{_settings.ToAddress}" },
            sender = $"{_settings.FromName} <{_settings.FromAddress}>",
            subject = $"Contact Form: {message.FirstName} {message.LastName}",
            html_body = $"""
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> {System.Net.WebUtility.HtmlEncode(message.FirstName)} {System.Net.WebUtility.HtmlEncode(message.LastName)}</p>
                <p><strong>Email:</strong> {System.Net.WebUtility.HtmlEncode(message.Email)}</p>
                <p><strong>Phone:</strong> {System.Net.WebUtility.HtmlEncode(message.PhoneNumber)}</p>
                <p><strong>Message:</strong></p>
                <blockquote>{System.Net.WebUtility.HtmlEncode(message.Message)}</blockquote>
                <hr />
                <p style="color:#888;font-size:12px;">Sent from evanbecker.net contact form at {message.Created:u}</p>
                """,
        };

        try
        {
            var response = await httpClient.PostAsJsonAsync(Smtp2GoEndpoint, body);
            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Contact notification email sent for {Email}", message.Email);
            }
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                logger.LogWarning("SMTP2Go returned {Status}: {Body}", response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send contact notification email via SMTP2Go");
        }
    }

    public async Task SendNewsletterSubscriptionNotificationAsync(string subscriberEmail)
    {
        if (string.IsNullOrEmpty(_settings.ApiKey) || string.IsNullOrEmpty(_settings.ToAddress))
        {
            logger.LogWarning("SMTP2Go not configured, skipping newsletter notification.");
            return;
        }

        var body = new
        {
            api_key = _settings.ApiKey,
            to = new[] { _settings.ToAddress },
            sender = $"{_settings.FromName} <{_settings.FromAddress}>",
            subject = "New Newsletter Subscriber",
            html_body = $"""
                <h2>New Newsletter Subscriber</h2>
                <p><strong>{System.Net.WebUtility.HtmlEncode(subscriberEmail)}</strong> just subscribed to your newsletter.</p>
                <hr />
                <p style="color:#888;font-size:12px;">Sent from evanbecker.net at {DateTime.UtcNow:u}</p>
                """,
        };

        try
        {
            var response = await httpClient.PostAsJsonAsync(Smtp2GoEndpoint, body);
            if (response.IsSuccessStatusCode)
                logger.LogInformation("Newsletter notification sent for {Email}", subscriberEmail);
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                logger.LogWarning("SMTP2Go returned {Status}: {Body}", response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send newsletter notification email via SMTP2Go");
        }
    }
}
