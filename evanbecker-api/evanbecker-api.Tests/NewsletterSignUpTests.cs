using System.Reflection;
using evanbecker_api.Configuration;
using evanbecker_api.Controllers;
using evanbecker_api.Dto;
using evanbecker_api.Services;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace evanbecker_api.Tests;

/// <summary>
/// The newsletter sign-up is anonymous and emails Evan about every new address, so it's protected like the contact
/// form (reCAPTCHA) and rate limited per client, and a repeat of an address never emails him again.
/// </summary>
public class NewsletterSignUpTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("a-token-google-refused")]
    public async Task Refuses_a_sign_up_that_fails_recaptcha(string? token)
    {
        var (controller, list, email) = SignUp(recaptchaPasses: false);

        var result = await controller.Add(new NewsLetterEntryDto { EmailAddress = "ada@example.com", RecaptchaToken = token });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(list.Addresses);
        Assert.Empty(email.Notified);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-an-address")]
    public async Task Refuses_an_empty_or_malformed_address(string address)
    {
        var (controller, list, email) = SignUp();

        var result = await controller.Add(new NewsLetterEntryDto { EmailAddress = address, RecaptchaToken = "ok" });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(list.Addresses);
        Assert.Empty(email.Notified);
    }

    [Theory]
    [InlineData("ada@example.com")]
    [InlineData("  Ada@Example.COM ")]
    public async Task Refuses_an_address_already_signed_up_without_emailing_Evan_again(string retry)
    {
        var (controller, list, email) = SignUp();
        list.Addresses.Add("ada@example.com");

        var result = await controller.Add(new NewsLetterEntryDto { EmailAddress = retry, RecaptchaToken = "ok" });

        Assert.IsType<ConflictResult>(result);
        Assert.Single(list.Addresses);
        Assert.Empty(email.Notified);
    }

    [Fact]
    public async Task A_sign_up_that_loses_a_race_for_the_same_address_doesnt_email_Evan()
    {
        var (controller, list, email) = SignUp();
        list.LoseNextRace = true;

        var result = await controller.Add(new NewsLetterEntryDto { EmailAddress = "ada@example.com", RecaptchaToken = "ok" });

        Assert.IsType<ConflictResult>(result);
        Assert.Empty(email.Notified);
    }

    [Fact]
    public async Task Signs_up_a_new_address_once_and_tells_Evan_once()
    {
        var (controller, list, email) = SignUp();

        var result = await controller.Add(new NewsLetterEntryDto { EmailAddress = " Ada@Example.com", RecaptchaToken = "ok" });

        Assert.IsType<OkResult>(result);
        Assert.Equal(["ada@example.com"], list.Addresses);
        Assert.Equal(["ada@example.com"], email.Notified);
    }

    [Fact]
    public void The_sign_up_endpoint_carries_the_newsletter_rate_limit()
    {
        var action = typeof(NewsLetterController).GetMethod(nameof(NewsLetterController.Add))!;

        Assert.Equal(RateLimits.Newsletter, action.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);
    }

    [Fact]
    public void Each_client_gets_five_sign_ups_an_hour_then_429s()
    {
        var partition = RateLimits.NewsletterPartition(Client(cloudflareVisitor: "203.0.113.7"));
        using var limiter = partition.Factory(partition.PartitionKey);

        for (var i = 0; i < RateLimits.NewsletterPermits; i++)
            Assert.True(limiter.AttemptAcquire().IsAcquired);
        Assert.False(limiter.AttemptAcquire().IsAcquired);
        Assert.Equal(TimeSpan.FromHours(1), RateLimits.NewsletterWindow);
        Assert.Equal(5, RateLimits.NewsletterPermits);
    }

    [Fact]
    public void Clients_are_told_apart_by_the_visitor_cloudflare_names_not_by_the_tunnel()
    {
        // Behind the tunnel every connection comes from cloudflared, so the connection address alone would put
        // every visitor in one bucket.
        Assert.Equal("203.0.113.7", RateLimits.ClientKey(Client(cloudflareVisitor: "203.0.113.7")));
        Assert.Equal("198.51.100.9", RateLimits.ClientKey(Client(cloudflareVisitor: "198.51.100.9")));
        Assert.Equal("127.0.0.1", RateLimits.ClientKey(Client(cloudflareVisitor: null)));
    }

    // ---- helpers

    private static DefaultHttpContext Client(string? cloudflareVisitor)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Loopback;
        if (cloudflareVisitor != null) context.Request.Headers["CF-Connecting-IP"] = cloudflareVisitor;
        return context;
    }

    private static (NewsLetterController Controller, FakeList List, FakeEmail Email) SignUp(bool recaptchaPasses = true)
    {
        var list = new FakeList();
        var email = new FakeEmail();
        return (new NewsLetterController(list, email, new FakeRecaptcha(recaptchaPasses)), list, email);
    }

    private sealed class FakeList : INewsletterList
    {
        public List<string> Addresses { get; } = [];
        public bool LoseNextRace { get; set; }

        public Task<bool> ContainsAsync(string emailAddress) =>
            Task.FromResult(Addresses.Any(a => string.Equals(a, emailAddress, StringComparison.OrdinalIgnoreCase)));

        public Task<bool> TryAddAsync(string emailAddress)
        {
            if (LoseNextRace) return Task.FromResult(false);
            Addresses.Add(emailAddress);
            return Task.FromResult(true);
        }
    }

    private sealed class FakeEmail : IEmailService
    {
        public List<string> Notified { get; } = [];
        public Task SendContactNotificationAsync(ContactMessage message) => throw new NotSupportedException();

        public Task SendNewsletterSubscriptionNotificationAsync(string subscriberEmail)
        {
            Notified.Add(subscriberEmail);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeRecaptcha(bool passes) : IRecaptchaService
    {
        public Task<bool> VerifyAsync(string token) => Task.FromResult(passes && token.Length > 0);
    }
}
