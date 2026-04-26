using evanbecker_api.Services;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/contact")]
public class ContactController : ControllerBase
{
    private readonly ApplicationContext _context;
    private readonly IEmailService _emailService;
    private readonly IRecaptchaService _recaptchaService;

    public ContactController(
        ApplicationContext context,
        IEmailService emailService,
        IRecaptchaService recaptchaService)
    {
        _context = context;
        _emailService = emailService;
        _recaptchaService = recaptchaService;
    }

    public class ContactRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Message { get; set; }
        public string? RecaptchaToken { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> ContactMessage([FromBody] ContactRequest request)
    {
        var isHuman = await _recaptchaService.VerifyAsync(request.RecaptchaToken ?? "");
        if (!isHuman)
            return BadRequest(new { error = "reCAPTCHA verification failed. Please try again." });

        var message = new ContactMessage
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            Message = request.Message,
            Created = DateTime.UtcNow
        };

        _context.ContactMessages.Add(message);
        await _context.SaveChangesAsync();

        await _emailService.SendContactNotificationAsync(message);

        return Ok();
    }
}
