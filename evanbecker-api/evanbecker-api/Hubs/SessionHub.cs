using evanbecker_api.Dto;
using evanbecker_api.Extensions;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace evanbecker_api.Hubs;

[Authorize]
public class SessionHub(
    ISessionManager sessionManager,
    IUserService userService,
    ILogger<SessionHub> logger) : Hub
{
    private const int MaxChatLength = 500;

    public async Task<SessionStateDto?> CreateRoom()
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return null;

        var room = sessionManager.CreateRoom(
            user.Id, Context.ConnectionId,
            user.FirstName ?? "User", user.LastName, user.Avatar);

        await Groups.AddToGroupAsync(Context.ConnectionId, $"session:{room.RoomCode}");
        logger.LogInformation("Session {Code} created by {User}", room.RoomCode, user.FirstName);
        return room.ToDto();
    }

    public async Task<SessionStateDto?> JoinRoom(string roomCode)
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return null;

        var room = sessionManager.JoinRoom(
            roomCode, user.Id, Context.ConnectionId,
            user.FirstName ?? "User", user.LastName, user.Avatar);

        if (room is null) return null;

        await Groups.AddToGroupAsync(Context.ConnectionId, $"session:{roomCode}");

        var memberDto = new SessionMemberDto(user.Id, user.FirstName ?? "User", user.LastName, user.Avatar, false);
        await Clients.OthersInGroup($"session:{roomCode}").SendAsync("MemberJoined", memberDto);

        logger.LogInformation("{User} joined session {Code}", user.FirstName, roomCode);
        return room.ToDto();
    }

    public async Task LeaveRoom(string roomCode)
    {
        var authId = Context.User?.GetAuthId();
        if (authId is null) return;

        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return;

        var (roomDestroyed, wasHost) = sessionManager.LeaveRoom(roomCode, user.Id);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"session:{roomCode}");

        if (roomDestroyed)
        {
            await Clients.Group($"session:{roomCode}").SendAsync("RoomClosed");
        }
        else if (wasHost)
        {
            await Clients.Group($"session:{roomCode}").SendAsync("HostDisconnected");
        }
        else
        {
            await Clients.Group($"session:{roomCode}").SendAsync("MemberLeft", user.Id);
        }
    }

    public async Task KickMember(string roomCode, Guid targetUserId)
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return;

        var room = sessionManager.GetRoom(roomCode);
        if (room is null) return;

        // Find the target's connection ID before kicking
        room.Members.TryGetValue(targetUserId, out var targetMember);
        var targetConnectionId = targetMember?.ConnectionId;

        if (!sessionManager.KickMember(roomCode, user.Id, targetUserId))
            return;

        // Notify the kicked member directly
        if (targetConnectionId is not null)
        {
            await Clients.Client(targetConnectionId).SendAsync("Kicked");
            await Groups.RemoveFromGroupAsync(targetConnectionId, $"session:{roomCode}");
        }

        // Notify remaining members
        await Clients.Group($"session:{roomCode}").SendAsync("MemberLeft", targetUserId);
        logger.LogInformation("{Host} kicked {Target} from session {Code}", user.FirstName, targetUserId, roomCode);
    }

    public async Task SendChat(string roomCode, string message)
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return;

        if (!sessionManager.ValidateChatRate(roomCode, user.Id))
            return; // Rate limited — silently drop

        var truncated = message.Length > MaxChatLength ? message[..MaxChatLength] : message;
        var chatDto = new ChatMessageDto(
            $"{user.FirstName}{(user.LastName is not null ? $" {user.LastName}" : "")}",
            user.Avatar,
            truncated,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await Clients.Group($"session:{roomCode}").SendAsync("ChatMessage", chatDto);
    }

    public async Task SetReady(string roomCode, bool ready)
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return;

        if (!sessionManager.SetReady(roomCode, user.Id, ready))
            return;

        await Clients.Group($"session:{roomCode}").SendAsync("MemberReady", user.Id, ready);
    }

    public async Task UpdatePlayback(string roomCode, PlaybackStateDto state)
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return;

        if (!sessionManager.UpdatePlayback(roomCode, user.Id, state))
            return;

        var room = sessionManager.GetRoom(roomCode);
        var memberCount = room?.Members.Count ?? 0;
        logger.LogDebug("Session {Code}: PlaybackSync → {Members} members. VideoId={VideoId}, Playing={IsPlaying}",
            roomCode, memberCount, state.VideoId ?? "null", state.IsPlaying);

        await Clients.OthersInGroup($"session:{roomCode}").SendAsync("PlaybackSync", state);
    }

    public async Task UpdateQueue(string roomCode, QueueStateDto queue)
    {
        var user = await userService.GetUserAsync(Context.User!);
        if (user is null) return;

        if (!sessionManager.UpdateQueue(roomCode, user.Id, queue))
            return;

        logger.LogDebug("Session {Code}: QueueSync → {TrackCount} tracks, index={Index}",
            roomCode, queue.Tracks.Count, queue.CurrentIndex);
        await Clients.OthersInGroup($"session:{roomCode}").SendAsync("QueueSync", queue);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var room = sessionManager.GetRoomByConnection(Context.ConnectionId);
        if (room is not null)
        {
            var member = room.Members.Values.FirstOrDefault(m => m.ConnectionId == Context.ConnectionId);
            logger.LogInformation("Session {Code}: {User} disconnected (wasHost={IsHost})",
                room.RoomCode, member?.FirstName ?? "unknown", member?.IsHost ?? false);
            if (member is not null)
            {
                var (roomDestroyed, wasHost) = sessionManager.LeaveRoom(room.RoomCode, member.UserId);

                if (roomDestroyed)
                {
                    await Clients.Group($"session:{room.RoomCode}").SendAsync("RoomClosed");
                }
                else if (wasHost)
                {
                    await Clients.Group($"session:{room.RoomCode}").SendAsync("HostDisconnected");
                }
                else
                {
                    await Clients.Group($"session:{room.RoomCode}").SendAsync("MemberLeft", member.UserId);
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}
