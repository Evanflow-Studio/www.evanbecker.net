using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace evanbecker_api.Configuration;

/// <summary>ASP.NET Core's built-in rate limiting, for the endpoints anyone can call that send Evan an email.</summary>
public static class RateLimits
{
    /// <summary>The policy on newsletter sign-ups.</summary>
    public const string Newsletter = "newsletter";

    /// <summary>Sign-ups one client may make per window.</summary>
    public const int NewsletterPermits = 5;

    public static readonly TimeSpan NewsletterWindow = TimeSpan.FromHours(1);

    public static void Configure(RateLimiterOptions options)
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddPolicy(Newsletter, NewsletterPartition);
    }

    /// <summary>A fixed window per client: <see cref="NewsletterPermits"/> sign-ups each <see cref="NewsletterWindow"/>.</summary>
    public static RateLimitPartition<string> NewsletterPartition(HttpContext context) =>
        RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = NewsletterPermits,
            Window = NewsletterWindow,
            QueueLimit = 0,
        });

    /// <summary>
    /// The visitor's IP address. Requests reach the API through Cloudflare's tunnel, so the connection itself comes
    /// from cloudflared, and Cloudflare names the visitor in <c>CF-Connecting-IP</c>. Without the header (a local
    /// run), the connection's address is used.
    /// </summary>
    public static string ClientKey(HttpContext context) =>
        context.Request.Headers["CF-Connecting-IP"].FirstOrDefault() is { Length: > 0 } visitor
            ? visitor
            : context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
