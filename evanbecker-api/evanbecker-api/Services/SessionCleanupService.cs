using evanbecker_api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace evanbecker_api.Services;

/// <summary>
/// Background service that sweeps expired session rooms every 15 seconds.
/// Notifies connected members via SignalR before destroying the room.
/// </summary>
public class SessionCleanupService(
    ISessionManager sessionManager,
    IHubContext<SessionHub> hubContext,
    ILogger<SessionCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(SweepInterval, stoppingToken);

            try
            {
                var expired = sessionManager.CleanupExpiredRooms();
                foreach (var code in expired)
                {
                    await hubContext.Clients.Group($"session:{code}").SendAsync("RoomClosed", cancellationToken: stoppingToken);
                    logger.LogInformation("Session room {Code} expired and was destroyed", code);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error during session cleanup sweep");
            }
        }
    }
}
