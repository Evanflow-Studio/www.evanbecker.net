using evanbecker_api.Tests.Guard;

namespace evanbecker_api.Tests;

/// <summary>The API, started once for the guard's metadata tests. Nothing here touches the database.</summary>
public sealed class RunningApiFixture : IAsyncLifetime
{
    public RunningApi Api { get; private set; } = null!;
    public IReadOnlyList<ApiEndpoint> Endpoints { get; private set; } = [];

    public async Task InitializeAsync()
    {
        Api = await RunningApi.StartAsync("Host=127.0.0.1;Port=1;Database=unused;Username=unused");
        Endpoints = ApiEndpoint.All(Api.Services);
    }

    public async Task DisposeAsync() => await Api.DisposeAsync();
}

/// <summary>
/// The personal-data guard, read from the running API's endpoint and ApiExplorer metadata: no endpoint returns an
/// entity, a body the guard can't read, or a member named like personal data, except the few in
/// <see cref="GuardAllowlist"/>. A new endpoint is covered the moment it's mapped, and one the guard can't read fails.
/// </summary>
public class PersonalDataGuardTests(RunningApiFixture fixture) : IClassFixture<RunningApiFixture>
{
    private IReadOnlyList<ApiEndpoint> Endpoints => fixture.Endpoints;

    [Fact]
    public void The_guard_reads_every_kind_of_endpoint_the_API_maps()
    {
        var keys = Endpoints.Select(e => e.Key).ToList();

        // Controllers (ApiExplorer describes them) and a mapped endpoint with no handler: if either disappears from
        // this list, the guard has stopped seeing part of the API.
        Assert.Contains("GET /api/v1/user", keys);
        Assert.Contains("POST /api/v1/newsletter", keys);
        Assert.Contains("POST /api/v1/contact", keys);
        Assert.Contains("* /health", keys);
    }

    [Fact]
    public void Every_endpoint_declares_what_it_returns()
    {
        var findings = Endpoints.SelectMany(e => ReadabilityFindings(e).Select(f => (e.Key, f)))
            .Where(x => !GuardAllowlist.Excuses(x.Key, x.f))
            .Select(x => $"{x.Key} {x.f}")
            .ToList();

        Assert.True(findings.Count == 0, Explain(findings,
            "Give each one a typed return (ActionResult<T>) or declare every response with [ProducesResponseType], " +
            "or add it to GuardAllowlist with a reason."));
    }

    [Fact]
    public void No_response_carries_an_entity_or_personal_data()
    {
        var findings = Endpoints.SelectMany(e => BodyFindings(e).Select(f => (e.Key, f)))
            .Where(x => !GuardAllowlist.Excuses(x.Key, x.f))
            .Select(x => $"{x.Key}: {x.f}")
            .ToList();

        Assert.True(findings.Count == 0, Explain(findings,
            "Entities never leave the API: return a DTO with only what the caller may see."));
    }

    [Fact]
    public void Personal_data_is_excused_only_where_the_caller_must_sign_in()
    {
        var open = GuardAllowlist.Entries.Where(entry => entry.PersonalData)
            .Where(entry => Endpoints.Any(e => e.Key == entry.Endpoint && !e.RequiresSignIn))
            .Select(entry => $"{entry.Endpoint}: {entry.Finding}")
            .ToList();

        Assert.True(open.Count == 0, Explain(open, "These endpoints don't need sign-in, so nothing may excuse personal data on them."));
    }

    [Fact]
    public void Every_allowance_still_excuses_something()
    {
        var findings = Endpoints.SelectMany(e => ReadabilityFindings(e).Concat(BodyFindings(e)).Select(f => (e.Key, f))).ToHashSet();
        var stale = GuardAllowlist.Entries.Where(entry => !findings.Contains((entry.Endpoint, entry.Finding)))
            .Select(entry => $"{entry.Endpoint}: {entry.Finding}")
            .ToList();

        Assert.True(stale.Count == 0, Explain(stale, "Remove these from GuardAllowlist: nothing needs them any more."));
    }

    private static IEnumerable<string> ReadabilityFindings(ApiEndpoint endpoint)
    {
        if (endpoint.Handler == null)
        {
            yield return GuardAllowlist.NoHandler;
            yield break;
        }
        if (!endpoint.Described) yield return GuardAllowlist.NotDescribed;
        if (endpoint.Undeclared() is { } undeclared) yield return undeclared;
    }

    private static IEnumerable<string> BodyFindings(ApiEndpoint endpoint) =>
        endpoint.Bodies.SelectMany(PersonalData.Problems).Distinct();

    private static string Explain(List<string> findings, string fix) =>
        $"{findings.Count} finding(s). {fix}\n  " + string.Join("\n  ", findings);
}
