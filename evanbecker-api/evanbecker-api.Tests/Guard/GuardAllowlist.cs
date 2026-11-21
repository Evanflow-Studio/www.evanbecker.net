namespace evanbecker_api.Tests.Guard;

/// <summary>
/// The only exceptions to the personal-data guard. Each names one endpoint, the exact finding it's excused from, and
/// why. Everything else must pass every rule, and an entry that no longer matches a finding fails the guard, so the list
/// can't outlive what it excuses. An entry that excuses personal data is only allowed on an endpoint that needs sign-in.
/// </summary>
public static class GuardAllowlist
{
    public sealed record Allowance(string Endpoint, string Finding, string Reason, bool PersonalData);

    public const string NoHandler = "has no handler whose response the guard can read";
    public const string NotDescribed = "isn't described by ApiExplorer, so its responses can't be read";

    private const string OwnEmail = "CurrentUserDto.Email matches the denied name Email";
    private const string OwnEmailReason = "The signed-in caller's own email, which the account page shows them.";

    public static readonly Allowance[] Entries =
    [
        new("* /health", NoHandler, "The health check writes only the word Healthy or Unhealthy.", PersonalData: false),
        new("GET /api/v1/user", OwnEmail, OwnEmailReason, PersonalData: true),
        new("POST /api/v1/user", OwnEmail, OwnEmailReason, PersonalData: true),
        new("PATCH /api/v1/user", OwnEmail, OwnEmailReason, PersonalData: true),
    ];

    public static bool Excuses(string endpoint, string finding) =>
        Entries.Any(entry => entry.Endpoint == endpoint && entry.Finding == finding);
}
