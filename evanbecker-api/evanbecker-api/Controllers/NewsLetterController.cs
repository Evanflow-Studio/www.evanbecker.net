using evanbecker_api.Configuration;
using evanbecker_api.Dto;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/newsletter")]
public class NewsLetterController(INewsletterList list, IEmailService emailService, IRecaptchaService recaptcha) : ControllerBase
{
    /// <summary>
    /// Signs an address up for the newsletter, protected like the contact form: a reCAPTCHA check, plus a rate limit
    /// per client (<see cref="RateLimits.Newsletter"/>). The reCAPTCHA check comes first, so the reply can't be used
    /// to test which addresses are on the list. An address already there, in any case, gets 409 and Evan isn't
    /// emailed again.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimits.Newsletter)]
    public async Task<IActionResult> Add(NewsLetterEntryDto dto)
    {
        if (!await recaptcha.VerifyAsync(dto.RecaptchaToken ?? ""))
            return BadRequest(new { error = "reCAPTCHA verification failed. Please try again." });

        var address = NormalizeAddress(dto.EmailAddress);
        if (address.Length is 0 or > 255 || !address.Contains('@'))
            return BadRequest(new { error = "Enter a valid email address." });

        if (await list.ContainsAsync(address) || !await list.TryAddAsync(address))
            return Conflict();

        await emailService.SendNewsletterSubscriptionNotificationAsync(address);
        return Ok();
    }

    /// <summary>Addresses are kept trimmed and in lower case, so one person can't sign up twice by retyping.</summary>
    public static string NormalizeAddress(string? address) => (address ?? "").Trim().ToLowerInvariant();
}
