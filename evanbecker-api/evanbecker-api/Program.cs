using evanbecker_api.Configuration;
using evanbecker_api.Extensions;
using evanbecker_api.Hubs;
using evanbecker_api.Services;
using evanbecker_domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// In Development, secrets come from .NET User Secrets (dotnet user-secrets).
// In Production/Test, secrets come from Infisical via SecretsConfigurationProvider.
builder.Configuration.AddEnvironmentVariables();
builder.Configuration.AddSecrets();

var environmentName = builder.Environment.EnvironmentName;
Console.WriteLine($"Starting API with Environment: {environmentName}");
var connectionString = builder.Configuration.GetConnectionString("Database");
builder.Services.AddDbContext<ApplicationContext>(options =>
    options.UseNpgsql(connectionString, innerOptions => innerOptions.UseAdminDatabase("postgres")));

var auth0Section = builder.Configuration.GetSection("Auth0");
var auth0Settings = new Auth0Configuration();
auth0Section.Bind(auth0Settings);
builder.Services.Configure<Auth0Configuration>(auth0Section);

builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.AddHttpClient<IEmailService, EmailService>();

builder.Services.Configure<RecaptchaSettings>(builder.Configuration.GetSection("Recaptcha"));
builder.Services.AddHttpClient<IRecaptchaService, RecaptchaService>();

builder.Services.Configure<SpotifyConfiguration>(builder.Configuration.GetSection("Spotify"));
builder.Services.AddHttpClient<ISpotifyService, SpotifyService>();
builder.Services.AddMemoryCache();

builder.Services.AddSignalR();
builder.Services.AddHealthChecks();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "api.evanbecker.net",
        Version = "v1",
        Description = $"The API for api.evanbecker.net. " +
                      $"This is specifically targeted to the '{environmentName}' environment: " +
                      $"'api-{environmentName}.evanbecker.net' environment."
    });

    o.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri($"https://{auth0Settings.Domain}/authorize"),
                TokenUrl         = new Uri($"https://{auth0Settings.Domain}/oauth/token"),
                Scopes = new Dictionary<string, string>
                {
                    { "openid", "OpenID Connect" },
                    { "profile", "User profile" },
                    { "email", "Email address" }
                }
            }
        }
    });

    o.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "oauth2"
                }
            },
            new[] { "openid", "profile", "email" }
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("cors", policy =>
    {
        policy.WithOrigins(
                "https://www.evanbecker.net",
                "https://evanbecker.net",
                "https://test.evanbecker.net",
                "http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.Authority = $"https://{auth0Settings.Domain}/";
    options.Audience = auth0Settings.Audience;
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(o =>
{
    o.OAuthClientId(auth0Settings.ClientId);
    o.OAuthAdditionalQueryStringParams(new Dictionary<string, string>
    {
        { "audience", auth0Settings.Audience ?? "" }
    });
    o.OAuthUsePkce();
});

app.UseCors("cors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<CommentHub>("/hubs/comments");
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResultStatusCodes =
    {
        [HealthStatus.Healthy]   = StatusCodes.Status200OK,
        [HealthStatus.Degraded]  = StatusCodes.Status200OK,
        [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
    }
});

await app.UseLocalDockerMigrationsAsync(environmentName);

app.Run();
