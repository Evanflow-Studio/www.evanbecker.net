using Microsoft.AspNetCore.SignalR;

namespace evanbecker_api.Hubs;

public class CommentHub : Hub
{
    public async Task JoinLocation(string targetLocation)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, targetLocation);
    }

    public async Task LeaveLocation(string targetLocation)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, targetLocation);
    }
}
