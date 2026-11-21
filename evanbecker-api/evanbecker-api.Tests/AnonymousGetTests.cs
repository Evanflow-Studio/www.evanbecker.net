using System.Net;
using System.Text.Json;
using evanbecker_api.Tests.Guard;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace evanbecker_api.Tests;

/// <summary>
/// The API against a real, migrated Postgres, with a row of personal data in every table that holds any: two users
/// (one the owner and an admin), a comment and a reply, a contact message and a newsletter address.
/// </summary>
public sealed class SeededApiFixture : IAsyncLifetime
{
    public static readonly string[] SeededSecrets =
    [
        "ada@example.com", "auth0|guard-owner", "grace@example.com", "auth0|guard-reader",
        "alan@example.com", "+1 555 0100", "linus@example.com",
    ];

    private GuardDatabase _database = null!;

    public RunningApi Api { get; private set; } = null!;
    public IReadOnlyList<ApiEndpoint> Endpoints { get; private set; } = [];

    /// <summary>Values a route parameter can take, all taken from the seeded rows, so a route that looks rows up finds them.</summary>
    public List<string> RouteValues { get; } = ["1", "the-wall"];

    public async Task InitializeAsync()
    {
        _database = await GuardDatabase.StartAsync();
        Api = await RunningApi.StartAsync(_database.ConnectionString);
        Endpoints = ApiEndpoint.All(Api.Services);

        using var scope = Api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();
        await db.Database.MigrateAsync();

        var owner = new User
        {
            Auth0Id = "auth0|guard-owner", FirstName = "Ada", LastName = "Lovelace", Email = "ada@example.com",
            Avatar = "https://example.com/ada.png", IsOwner = true, IsAdmin = true,
        };
        var reader = new User
        {
            Auth0Id = "auth0|guard-reader", FirstName = "Grace", LastName = "Hopper", Email = "grace@example.com",
        };
        var comment = new Comment
        {
            Author = owner, CommentText = "A seeded comment", TargetLocation = "the-wall", Published = DateTime.UtcNow,
            Replies = [new Reply { Author = reader, CommentText = "A seeded reply", TargetLocation = "the-wall", Published = DateTime.UtcNow }],
        };
        var message = new ContactMessage
        {
            FirstName = "Alan", LastName = "Turing", Email = "alan@example.com", PhoneNumber = "+1 555 0100",
            Message = "A seeded message", Created = DateTime.UtcNow,
        };
        var entry = new NewsLetterEntry { EmailAddress = "linus@example.com", Created = DateTime.UtcNow };

        db.AddRange(owner, reader, comment, message, entry);
        await db.SaveChangesAsync();

        RouteValues.AddRange(new[] { owner.Id, reader.Id }.Select(id => id.ToString()));
        RouteValues.AddRange(new[] { comment.Id, comment.Replies[0].Id, message.Id, entry.Id }.Select(id => id!.Value.ToString()));
        RouteValues.AddRange(["Ada", "Grace", "auth0|guard-owner", "ada@example.com"]);
    }

    public async Task DisposeAsync()
    {
        await Api.DisposeAsync();
        await _database.DisposeAsync();
    }
}

/// <summary>
/// The personal-data guard at run time: every GET the API maps, called without credentials, against a database full of
/// personal data. Anything open to everyone must answer without an email address, a seeded identifier, or a key named
/// like personal data. Anything that needs sign-in must refuse.
/// </summary>
[Trait("Category", "Postgres")]
public class AnonymousGetTests(SeededApiFixture fixture) : IClassFixture<SeededApiFixture>
{
    private const int MaxCallsPerRoute = 100;

    [Fact]
    public async Task The_database_holds_the_personal_data_the_calls_must_not_return()
    {
        using var scope = fixture.Api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();

        Assert.True(await db.Users.AnyAsync(u => u.Email == "ada@example.com" && u.IsOwner && u.IsAdmin));
        Assert.True(await db.Users.AnyAsync(u => u.Email == "grace@example.com"));
        Assert.True(await db.Set<Comment>().AnyAsync(c => c.TargetLocation == "the-wall"));
        Assert.True(await db.Set<Reply>().AnyAsync());
        Assert.True(await db.ContactMessages.AnyAsync(m => m.PhoneNumber == "+1 555 0100"));
        Assert.True(await db.NewsLetterEntries.AnyAsync(e => e.EmailAddress == "linus@example.com"));
    }

    [Fact]
    public async Task No_GET_anyone_can_call_returns_personal_data()
    {
        var open = fixture.Endpoints.Where(e => e.AllowsGet && !e.RequiresSignIn).ToList();
        Assert.NotEmpty(open);

        using var client = new HttpClient { BaseAddress = fixture.Api.BaseAddress };
        var findings = new List<string>();
        var calls = 0;
        foreach (var endpoint in open)
        {
            foreach (var path in Paths(endpoint.Endpoint.RoutePattern))
            {
                calls++;
                using var response = await client.GetAsync(path);
                var body = await response.Content.ReadAsStringAsync();
                findings.AddRange(Findings(body).Select(f => $"GET {path} ({(int)response.StatusCode}): {f}"));
            }
        }

        Assert.True(calls >= open.Count);
        Assert.True(findings.Count == 0,
            $"{findings.Count} finding(s) in {calls} anonymous call(s):\n  " + string.Join("\n  ", findings.Distinct()));
    }

    [Fact]
    public async Task Every_GET_that_needs_sign_in_refuses_an_anonymous_caller()
    {
        using var client = new HttpClient { BaseAddress = fixture.Api.BaseAddress };
        var answered = new List<string>();
        foreach (var endpoint in fixture.Endpoints.Where(e => e.AllowsGet && e.RequiresSignIn))
        foreach (var path in Paths(endpoint.Endpoint.RoutePattern).Take(5))
        {
            using var response = await client.GetAsync(path);
            if (response.StatusCode != HttpStatusCode.Unauthorized) answered.Add($"GET {path}: {(int)response.StatusCode}");
        }

        Assert.True(answered.Count == 0, "Answered without sign-in:\n  " + string.Join("\n  ", answered));
    }

    private static IEnumerable<string> Findings(string body)
    {
        foreach (var email in PersonalData.EmailShaped.Matches(body).Select(m => m.Value).Distinct())
            yield return $"an email address ({email})";
        foreach (var secret in SeededApiFixture.SeededSecrets.Where(s => body.Contains(s, StringComparison.OrdinalIgnoreCase)))
            yield return $"a seeded identifier ({secret})";

        JsonDocument? json = null;
        try { json = JsonDocument.Parse(body); }
        catch (JsonException) { }
        if (json == null) yield break;
        using (json)
            foreach (var key in Keys(json.RootElement).Distinct())
                if (PersonalData.DeniedName(key) is { } denied)
                    yield return $"the key {key}, which matches the denied name {denied}";
    }

    private static IEnumerable<string> Keys(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => element.EnumerateObject().SelectMany(p => Keys(p.Value).Prepend(p.Name)),
        JsonValueKind.Array => element.EnumerateArray().SelectMany(Keys),
        _ => [],
    };

    /// <summary>Every way to fill the route's parameters from the seeded values, up to a limit, as escaped paths.</summary>
    private IEnumerable<string> Paths(RoutePattern pattern)
    {
        IEnumerable<string> paths = [""];
        foreach (var segment in pattern.PathSegments)
        {
            IEnumerable<string> fills = [""];
            foreach (var part in segment.Parts)
            {
                var options = part switch
                {
                    RoutePatternLiteralPart literal => [literal.Content],
                    RoutePatternSeparatorPart separator => [separator.Content],
                    RoutePatternParameterPart parameter => Candidates(parameter),
                    _ => (IEnumerable<string>)[""],
                };
                fills = fills.SelectMany(prefix => options.Select(option => prefix + option)).ToList();
            }
            paths = paths.SelectMany(prefix => fills.Select(fill => $"{prefix}/{fill}")).ToList();
        }
        return paths.Select(p => p.Length == 0 ? "/" : p).Distinct().Take(MaxCallsPerRoute);
    }

    private IEnumerable<string> Candidates(RoutePatternParameterPart parameter)
    {
        var policies = parameter.ParameterPolicies.Select(p => p.Content ?? "").ToList();
        IEnumerable<string> values = fixture.RouteValues;
        if (policies.Contains("guid")) values = values.Where(v => Guid.TryParse(v, out _));
        if (policies.Contains("int") || policies.Contains("long")) values = values.Where(v => long.TryParse(v, out _));
        return values.Select(Uri.EscapeDataString);
    }
}
