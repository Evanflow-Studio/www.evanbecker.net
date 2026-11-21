using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace evanbecker_api.Services;

/// <summary>The newsletter's list of addresses, as the sign-up endpoint uses it.</summary>
public interface INewsletterList
{
    /// <summary>Whether the address is already signed up, ignoring case.</summary>
    Task<bool> ContainsAsync(string emailAddress);

    /// <summary>Adds the address. False when it's already there, including a sign-up for it that won a race.</summary>
    Task<bool> TryAddAsync(string emailAddress);
}

public class EfNewsletterList(ApplicationContext context) : INewsletterList
{
    // Older rows were stored as typed, so compare without case.
    public Task<bool> ContainsAsync(string emailAddress) =>
        context.NewsLetterEntries.AnyAsync(e => e.EmailAddress.ToLower() == emailAddress.ToLower());

    public async Task<bool> TryAddAsync(string emailAddress)
    {
        context.NewsLetterEntries.Add(new NewsLetterEntry { EmailAddress = emailAddress, Created = DateTime.UtcNow });
        try
        {
            await context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // The unique index on EmailAddress: the same address was signed up a moment ago.
            return false;
        }
    }
}
