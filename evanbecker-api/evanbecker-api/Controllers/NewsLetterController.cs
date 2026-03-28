using evanbecker_api.Dto;
using evanbecker_api.Services;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/newsletter")]
public class NewsLetterController(ApplicationContext context, IEmailService emailService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Add(NewsLetterEntryDto dto)
    {
        var already = await context.NewsLetterEntries
            .AnyAsync(e => e.EmailAddress == dto.EmailAddress);

        if (already)
            return Conflict();

        context.NewsLetterEntries.Add(new NewsLetterEntry
        {
            EmailAddress = dto.EmailAddress,
            Created = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        await emailService.SendNewsletterSubscriptionNotificationAsync(dto.EmailAddress);

        return Ok();
    }
}