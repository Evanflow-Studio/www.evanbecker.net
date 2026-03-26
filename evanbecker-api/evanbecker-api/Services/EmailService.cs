using evanbecker_domain.Entities;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;

namespace evanbecker_api.Services;

public class SmtpSettings
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "evanbecker.net";
    public string ToAddress { get; set; } = "";
}

public interface IEmailService
{
    Task SendContactNotificationAsync(ContactMessage message);
}

public class EmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> settings, ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendContactNotificationAsync(ContactMessage message)
    {
        if (string.IsNullOrEmpty(_settings.Host) || string.IsNullOrEmpty(_settings.ToAddress))
        {
            _logger.LogWarning("SMTP not configured, skipping contact notification email.");
            return;
        }

        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
        email.To.Add(MailboxAddress.Parse(_settings.ToAddress));
        email.Subject = $"Contact Form: {message.FirstName} {message.LastName}";

        email.Body = new TextPart("html")
        {
            Text = $"""
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> {System.Net.WebUtility.HtmlEncode(message.FirstName)} {System.Net.WebUtility.HtmlEncode(message.LastName)}</p>
                <p><strong>Email:</strong> {System.Net.WebUtility.HtmlEncode(message.Email)}</p>
                <p><strong>Phone:</strong> {System.Net.WebUtility.HtmlEncode(message.PhoneNumber)}</p>
                <p><strong>Message:</strong></p>
                <blockquote>{System.Net.WebUtility.HtmlEncode(message.Message)}</blockquote>
                <hr />
                <p style="color:#888;font-size:12px;">Sent from evanbecker.net contact form at {message.Created:u}</p>
                """
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.Host, _settings.Port, MailKit.Security.SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_settings.Username, _settings.Password);
        await client.SendAsync(email);
        await client.DisconnectAsync(true);

        _logger.LogInformation("Contact notification email sent for {Email}", message.Email);
    }
}
