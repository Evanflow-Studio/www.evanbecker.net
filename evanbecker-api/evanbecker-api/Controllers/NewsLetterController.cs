using evanbecker_api.Dto;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/newsletter")]
public class NewsLetterController(ApplicationContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Add(NewsLetterEntryDto dto)
    {
        var entry = new NewsLetterEntry
        {
            EmailAddress = dto.EmailAddress,
            Created = DateTimeOffset.Now
        };
        context.NewsLetterEntries.Add(entry);
        await context.SaveChangesAsync();
        return Ok();
    }
}