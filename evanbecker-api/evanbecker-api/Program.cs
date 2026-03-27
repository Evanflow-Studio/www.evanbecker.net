using evanbecker_api.Configuration;
using evanbecker_api.Extensions;
using evanbecker_api.Services;
using evanbecker_domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Configuration.AddJsonFile("./secrets/appsettings.Secrets.json", optional: true, reloadOnChange: true);
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

var gitHubSection = builder.Configuration.GetSection("GitHub");
var gitHubSettings = new GitHubConfiguration();
gitHubSection.Bind(gitHubSettings);
builder.Services.Configure<GitHubConfiguration>(gitHubSection);

builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.AddHttpClient<IEmailService, EmailService>();

builder.Services.Configure<RecaptchaSettings>(builder.Configuration.GetSection("Recaptcha"));
builder.Services.AddHttpClient<IRecaptchaService, RecaptchaService>();

builder.Services.Configure<SpotifyConfiguration>(builder.Configuration.GetSection("Spotify"));
builder.Services.AddHttpClient<ISpotifyService, SpotifyService>();
builder.Services.AddMemoryCache();

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
                TokenUrl = new Uri($"https://{auth0Settings.Domain}/oauth/token"),
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
    options.AddPolicy("cors", builder =>
    {
        builder.AllowAnyHeader();
        builder.AllowAnyMethod();
        builder.AllowAnyOrigin();
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

app.Use((context, next) =>
{
    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    return next.Invoke();
});

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

app.UseCors();

app.UseCors("cors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.UseLocalDockerMigrationsAsync(environmentName);

app.Run();