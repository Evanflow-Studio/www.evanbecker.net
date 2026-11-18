using System.Diagnostics;
using System.Reflection;
using System.Runtime.ExceptionServices;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace evanbecker_api.Tests.Guard;

/// <summary>
/// The API's own Program, started inside the test process on a loopback port, so the guard sees exactly the endpoints
/// the image serves. It finds the host the way ASP.NET Core's test tools do, from the hosting DiagnosticListener's
/// HostBuilt event, so it needs nothing beyond the shared framework.
/// </summary>
public sealed class RunningApi : IAsyncDisposable
{
    private const string MarkerKey = "PersonalDataGuard:Run";
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(60);

    private readonly Task<int> _run;

    private RunningApi(IHost host, Task<int> run, Uri baseAddress)
    {
        Host = host;
        _run = run;
        BaseAddress = baseAddress;
    }

    public IHost Host { get; }
    public IServiceProvider Services => Host.Services;
    public Uri BaseAddress { get; }

    /// <summary>
    /// Starts the API in the Test environment against <paramref name="connectionString"/>. It doesn't migrate at
    /// startup, and nothing at startup touches the database, so a connection string to nowhere is fine for tests that
    /// only read the endpoints.
    /// </summary>
    public static async Task<RunningApi> StartAsync(string connectionString)
    {
        var marker = Guid.NewGuid().ToString("N");
        string[] args =
        [
            "--applicationName=evanbecker-api",
            $"--contentRoot={AppContext.BaseDirectory}",
            "--environment=Test",
            "--urls=http://127.0.0.1:0",
            $"--ConnectionStrings:Database={connectionString}",
            "--Database:MigrateOnStartup=false",
            $"--{MarkerKey}={marker}",
        ];

        using var capture = new HostCapture(marker);
        using var subscription = DiagnosticListener.AllListeners.Subscribe(capture);

        var entryPoint = typeof(Controllers.UserController).Assembly.EntryPoint
            ?? throw new InvalidOperationException("The API assembly has no entry point.");
        var run = Task.Run(() => Invoke(entryPoint, args));

        var host = await FirstOf(capture.Host, run, "build its host");
        var lifetime = host.Services.GetRequiredService<IHostApplicationLifetime>();
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using (lifetime.ApplicationStarted.Register(() => started.TrySetResult()))
            await FirstOf(started.Task, run, "start");

        // An environment variable outranks the arguments. Stop before anything seeds a database nobody meant.
        var configured = host.Services.GetRequiredService<IConfiguration>().GetConnectionString("Database");
        if (configured != connectionString)
        {
            lifetime.StopApplication();
            throw new InvalidOperationException(
                "The API started with a different database than the test gave it, so an environment variable " +
                "(ConnectionStrings__Database) is overriding it. Unset it before running the guard.");
        }

        var address = host.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First();
        return new RunningApi(host, run, new Uri(address));
    }

    public async ValueTask DisposeAsync()
    {
        Host.Services.GetRequiredService<IHostApplicationLifetime>().StopApplication();
        await _run.WaitAsync(Timeout);
    }

    private static int Invoke(MethodInfo entryPoint, string[] args)
    {
        try
        {
            return entryPoint.Invoke(null, [args]) switch
            {
                Task<int> task => task.GetAwaiter().GetResult(),
                int code => code,
                _ => 0,
            };
        }
        catch (TargetInvocationException e) when (e.InnerException != null)
        {
            ExceptionDispatchInfo.Throw(e.InnerException);
            throw;
        }
    }

    private static async Task<T> FirstOf<T>(Task<T> wanted, Task<int> run, string step)
    {
        await FirstOf((Task)wanted, run, step);
        return await wanted;
    }

    private static async Task FirstOf(Task wanted, Task<int> run, string step)
    {
        var first = await Task.WhenAny(wanted, run, Task.Delay(Timeout));
        if (first == wanted) return;
        if (first == run)
        {
            await run; // rethrows the startup failure
            throw new InvalidOperationException($"The API exited with {run.Result} before it could {step}.");
        }
        throw new TimeoutException($"The API didn't {step} within {Timeout.TotalSeconds:0} s.");
    }

    /// <summary>Picks this run's host out of every host built in the process, by the marker in its configuration.</summary>
    private sealed class HostCapture(string marker)
        : IObserver<DiagnosticListener>, IObserver<KeyValuePair<string, object?>>, IDisposable
    {
        private readonly TaskCompletionSource<IHost> _host = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly List<IDisposable> _subscriptions = [];

        public Task<IHost> Host => _host.Task;

        public void OnNext(DiagnosticListener listener)
        {
            if (listener.Name != "Microsoft.Extensions.Hosting") return;
            lock (_subscriptions) _subscriptions.Add(listener.Subscribe(this));
        }

        public void OnNext(KeyValuePair<string, object?> e)
        {
            if (e.Key == "HostBuilt" && e.Value is IHost host &&
                host.Services.GetService<IConfiguration>()?[MarkerKey] == marker)
                _host.TrySetResult(host);
        }

        public void OnCompleted() { }
        public void OnError(Exception error) { }

        public void Dispose()
        {
            lock (_subscriptions)
                foreach (var subscription in _subscriptions) subscription.Dispose();
        }
    }
}
