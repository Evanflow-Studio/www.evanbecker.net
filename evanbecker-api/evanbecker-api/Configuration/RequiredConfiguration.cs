namespace evanbecker_api.Configuration;

/// <summary>
/// Checks at startup that the settings the API can't run without are present, and reports
/// optional ones whose features will be off. Prints setting names only, never values.
/// </summary>
public static class RequiredConfiguration
{
    public static readonly string[] Required =
    [
        "ConnectionStrings:Database",
        "Auth0:Domain",
        "Auth0:Audience",
        "Auth0:ClientId",
    ];

    // Each of these turns a feature off when missing (see evanbecker-api/README.md).
    public static readonly string[] Optional =
    [
        "Email:ApiKey",
        "Email:ToAddress",
        "Recaptcha:SecretKey",
    ];

    // --migrate-only applies the migrations and exits, so it needs the database and nothing else.
    public static readonly string[] RequiredToMigrate =
    [
        "ConnectionStrings:Database",
    ];

    public static void Validate(IConfiguration configuration, bool migrateOnly = false)
    {
        if (!migrateOnly)
        {
            var missingOptional = Optional.Where(key => IsMissing(configuration[key])).ToList();
            if (missingOptional.Count > 0)
                Console.WriteLine($"Optional settings not set, so their features are off: {string.Join(", ", missingOptional)}");
        }

        var required = migrateOnly ? RequiredToMigrate : Required;
        var missingRequired = required.Where(key => IsMissing(configuration[key])).ToList();
        if (missingRequired.Count > 0)
            throw new InvalidOperationException(
                $"Required settings are missing: {string.Join(", ", missingRequired)}. " +
                "Set them as Key Vault secrets (Section--Key), environment variables (Section__Key) or user secrets.");
    }

    // Empty values and "<...>" placeholders count as missing.
    public static bool IsMissing(string? value) =>
        string.IsNullOrWhiteSpace(value) || (value.StartsWith('<') && value.EndsWith('>'));
}
