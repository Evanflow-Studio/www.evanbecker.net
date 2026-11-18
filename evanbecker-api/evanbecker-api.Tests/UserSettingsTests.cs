using System.Text.Json;
using evanbecker_api.Dto;
using evanbecker_api.Services;
using evanbecker_domain.Entities;

namespace evanbecker_api.Tests;

/// <summary>
/// The newsletter opt-in from the PATCH body the account page sends to the row, and from the row to
/// what the user endpoints return. The column itself is checked on Postgres by
/// scripts/smoke-api-migrations.sh. JSON uses ASP.NET's web defaults, as the controllers do.
/// </summary>
public class UserSettingsTests
{
    private static UpdateUserDto Patch(string json) =>
        JsonSerializer.Deserialize<UpdateUserDto>(json, JsonSerializerOptions.Web)!;

    private static string Response(User user) =>
        JsonSerializer.Serialize(CurrentUserDto.From(user), JsonSerializerOptions.Web);

    [Fact]
    public void A_new_user_is_not_opted_in_to_newsletters()
    {
        Assert.Contains("\"newsletterOptIn\":false", Response(new User()));
    }

    [Fact]
    public void Saves_the_newsletter_opt_in_and_returns_it()
    {
        var user = new User { FirstName = "Ada" };

        UserService.ApplyUpdate(user, Patch("""{"newsletterOptIn":true}"""));
        Assert.Contains("\"newsletterOptIn\":true", Response(user));

        UserService.ApplyUpdate(user, Patch("""{"newsletterOptIn":false}"""));
        Assert.Contains("\"newsletterOptIn\":false", Response(user));
        Assert.Equal("Ada", user.FirstName);
    }

    [Fact]
    public void A_profile_save_leaves_the_opt_in_as_it_was()
    {
        // The profile form's PATCH sends names and avatar only.
        var user = new User { FirstName = "Ada", NewsletterOptIn = true };

        UserService.ApplyUpdate(user, Patch("""{"firstName":"Ada","lastName":"King","avatar":null}"""));

        Assert.Equal("King", user.LastName);
        Assert.True(user.NewsletterOptIn);
    }

    [Fact]
    public void The_user_row_never_serializes_the_opt_in()
    {
        // No endpoint returns the User row (PersonalDataGuardTests fails one that does). If one ever did, the
        // opt-in would still stay out of it: only CurrentUserDto carries it, to the user it belongs to.
        var user = new User { FirstName = "Ada", NewsletterOptIn = true };

        Assert.DoesNotContain("newsletterOptIn", JsonSerializer.Serialize(user, JsonSerializerOptions.Web));
        Assert.Contains("\"newsletterOptIn\":true", Response(user));
    }

    [Theory]
    [InlineData("ada@example.com", null)]
    [InlineData("  ", null)]
    [InlineData(null, null)]
    [InlineData("Ada", "Ada")]
    [InlineData(" Ada ", "Ada")]
    public void Never_takes_an_email_as_a_first_name(string? sent, string? stored)
    {
        // Auth0's name is the email for an email/password sign-up, and older clients sent it.
        Assert.Equal(stored, UserService.FirstNameOrNull(sent));
    }
}
