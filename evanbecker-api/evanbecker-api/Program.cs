using evanbecker_api.Configuration;
using evanbecker_api.Extensions;
using evanbecker_api.Services;
using evanbecker_api.Services.Interfaces;
using evanbecker_domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Configuration.AddJsonFile("./secrets/appsettings.Secrets.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();

var environmentName = builder.Environment.EnvironmentName;
Console.WriteLine($"Starting API with Environment: {environmentName}");
var connectionString = builder.Configuration.GetConnectionString("Database");
builder.Services.AddDbContext<ApplicationContext>(options =>
    options.UseNpgsql(connectionString, innerOptions => innerOptions.UseAdminDatabase("defaultdb")));

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
    // TODO: MOVE TO AppSettings
    options.Authority = "https://dev-m3uiopcp.us.auth0.com/";
    options.Audience = "evanbecker.api";
});

var app = builder.Build();

app.Use((context, next) =>
{
    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    return next.Invoke();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

app.UseCors("cors");
app.UseAuthentication(); // use the Bearer Authentication
app.UseAuthorization(); // use the Authorization from Auth0
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

await app.UseLocalDockerMigrationsAsync(environmentName);

app.Run();