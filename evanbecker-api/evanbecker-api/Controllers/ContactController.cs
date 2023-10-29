using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/contact")]
public class ContactController : ControllerBase
{
    private readonly ApplicationContext _context;

    public ContactController(ApplicationContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> ContactMessage(ContactMessage message)
    {
        message.Created = DateTime.Now.ToUniversalTime();
        _context.ContactMessages.Add(message);
        await _context.SaveChangesAsync();
        return Ok();
    }
}