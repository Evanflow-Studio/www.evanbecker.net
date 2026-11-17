using System.Text.Json;
using System.Text.Json.Serialization;
using evanbecker_api.Tests.Guard;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Tests;

/// <summary>The guard's own rules: which names count as personal data, and what the type walker reports.</summary>
public class PersonalDataRulesTests
{
    [Theory]
    [InlineData("Email", "Email")]
    [InlineData("emailAddress", "Email")]
    [InlineData("UserEmails", "Email")]
    [InlineData("auth0Id", "Auth0")]
    [InlineData("Auth0Sub", "Auth0")]
    [InlineData("sub", "Sub")]
    [InlineData("isAdmin", "IsAdmin")]
    [InlineData("IsOwner", "IsOwner")]
    [InlineData("Roles", "Role")]
    [InlineData("passwordHash", "Password")]
    [InlineData("RecaptchaToken", "Token")]
    [InlineData("clientSecret", "Secret")]
    [InlineData("IPAddress", "Ip")]
    [InlineData("phoneNumber", "Phone")]
    [InlineData("Addresses", "Address")]
    public void A_name_with_a_denied_word_is_personal_data(string name, string denied) =>
        Assert.Equal(denied, PersonalData.DeniedName(name));

    [Theory]
    [InlineData("Id")]
    [InlineData("FirstName")]
    [InlineData("Avatar")]
    [InlineData("Description")]
    [InlineData("Subject")]
    [InlineData("Subtitle")]
    [InlineData("Published")]
    [InlineData("Zip")]
    [InlineData("Shipped")]
    public void A_name_that_only_contains_the_letters_is_not(string name) =>
        Assert.Null(PersonalData.DeniedName(name));

    [Theory]
    [InlineData("reach me at ada@example.com today")]
    [InlineData("{\"x\":\"first.last+tag@mail.example.co.uk\"}")]
    public void An_email_shaped_string_is_found_anywhere(string body) =>
        Assert.Matches(PersonalData.EmailShaped, body);

    public record Author(string? FirstName, string? Avatar);
    public record Safe(Guid Id, DateTime Published, string Text, Author Author, IReadOnlyList<Author> Others, int[] Counts);

    [Fact]
    public void A_DTO_of_names_ids_and_dates_has_no_problems() =>
        Assert.Empty(PersonalData.Problems(typeof(Safe)));

    [Fact]
    public void The_framework_error_bodies_have_no_problems()
    {
        Assert.Empty(PersonalData.Problems(typeof(ProblemDetails)));
        Assert.Empty(PersonalData.Problems(typeof(ValidationProblemDetails)));
    }

    [Fact]
    public void An_entity_is_a_problem_wherever_it_sits()
    {
        Assert.Equal(["User is User, an entity from evanbecker-domain"], PersonalData.Problems(typeof(User)));
        Assert.Equal(["List<Comment>[] is Comment, an entity from evanbecker-domain"], PersonalData.Problems(typeof(List<Comment>)));
    }

    public record Wrapper(Author Author, User Owner);

    [Fact]
    public void An_entity_inside_a_DTO_is_a_problem() =>
        Assert.Equal(["Wrapper.Owner is User, an entity from evanbecker-domain"], PersonalData.Problems(typeof(Wrapper)));

    public record Leaky(string FirstName, Contact Contact);
    public record Contact([property: JsonPropertyName("mail")] string Email, string Phone);

    [Fact]
    public void A_denied_name_is_found_however_deep()
    {
        var problems = PersonalData.Problems(typeof(Leaky));

        Assert.Equal(
        [
            "Leaky.Contact.Email matches the denied name Email",
            "Leaky.Contact.Phone matches the denied name Phone",
        ], problems);
    }

    public record Renamed([property: JsonPropertyName("emailAddress")] string Contact);

    [Fact]
    public void A_JSON_name_counts_as_much_as_the_property_name() =>
        Assert.Equal(["Renamed.Contact matches the denied name Email"], PersonalData.Problems(typeof(Renamed)));

    public record Ignored(string FirstName, [property: JsonIgnore] string? Email);

    [Fact]
    public void A_member_the_serializer_never_writes_is_not_a_problem() =>
        Assert.Empty(PersonalData.Problems(typeof(Ignored)));

    public record Loose(object Payload, JsonElement Raw, Dictionary<string, string> ByKey);

    [Fact]
    public void A_body_whose_JSON_the_type_doesnt_fix_is_a_problem()
    {
        var problems = PersonalData.Problems(typeof(Loose));

        Assert.Equal(
        [
            "Loose.Payload is object, whose JSON can be anything",
            "Loose.Raw is raw JSON",
            "Loose.ByKey is a dictionary, whose keys can't be checked",
        ], problems);
    }

    [Fact]
    public void An_anonymous_type_is_a_problem()
    {
        var anonymous = new { error = "x" }.GetType();

        Assert.Single(PersonalData.Problems(anonymous), p => p.EndsWith("is an anonymous type"));
    }

    public record Extended(string Title)
    {
        [JsonExtensionData] public Dictionary<string, JsonElement>? Extra { get; init; }
    }

    [Fact]
    public void Extension_data_is_a_problem() =>
        Assert.Equal(["Extended.Extra is extension data, whose keys can't be checked"], PersonalData.Problems(typeof(Extended)));

    [JsonDerivedType(typeof(Detailed), "detailed")]
    public record Base(Guid Id);
    public record Detailed(Guid Id, string Email) : Base(Id);

    [Fact]
    public void A_derived_type_the_serializer_can_write_is_walked_too() =>
        Assert.Contains("Base<Detailed>.Email matches the denied name Email", PersonalData.Problems(typeof(Base)));
}
