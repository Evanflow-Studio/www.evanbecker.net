using System.Collections.Concurrent;
using evanbecker_api.Dto;

namespace evanbecker_api.Services;

public interface ISessionManager
{
    SessionRoom CreateRoom(Guid userId, string connectionId, string firstName, string? lastName, string? avatar);
    SessionRoom? JoinRoom(string code, Guid userId, string connectionId, string firstName, string? lastName, string? avatar);
    (bool RoomDestroyed, bool WasHost) LeaveRoom(string code, Guid userId);
    SessionRoom? RejoinRoom(string code, Guid userId, string newConnectionId);
    bool KickMember(string code, Guid hostUserId, Guid targetUserId);
    bool UpdatePlayback(string code, Guid hostUserId, PlaybackStateDto state);
    bool UpdateQueue(string code, Guid hostUserId, QueueStateDto queue);
    bool ValidateChatRate(string code, Guid userId);
    List<string> CleanupExpiredRooms();
    SessionRoom? GetRoom(string code);
    SessionRoom? GetRoomByConnection(string connectionId);
}

public class SessionRoom
{
    public required string RoomCode { get; init; }
    public Guid HostUserId { get; set; }
    public string HostConnectionId { get; set; } = "";
    public ConcurrentDictionary<Guid, SessionMember> Members { get; } = new();
    public PlaybackStateDto? CurrentPlayback { get; set; }
    public QueueStateDto? CurrentQueue { get; set; }
    public DateTime LastActivity { get; set; } = DateTime.UtcNow;
    public DateTime HostDisconnectedAt { get; set; } = DateTime.MinValue;

    public SessionStateDto ToDto()
    {
        var members = Members.Values
            .Select(m => new SessionMemberDto(m.UserId, m.FirstName, m.LastName, m.Avatar, m.IsHost))
            .ToList();

        var host = members.FirstOrDefault(m => m.IsHost)
            ?? new SessionMemberDto(HostUserId, "Host", null, null, true);

        return new SessionStateDto(RoomCode, host, members, CurrentPlayback, CurrentQueue);
    }
}

public class SessionMember
{
    public Guid UserId { get; init; }
    public string ConnectionId { get; set; } = "";
    public string FirstName { get; init; } = "";
    public string? LastName { get; init; }
    public string? Avatar { get; init; }
    public bool IsHost { get; init; }
    public DateTime LastChatMessage { get; set; } = DateTime.MinValue;
}

public class SessionManager : ISessionManager
{
    private readonly ConcurrentDictionary<string, SessionRoom> _rooms = new();
    private static readonly char[] CodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
    private static readonly TimeSpan HostTimeoutDuration = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan InactivityTimeout = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan ChatRateLimit = TimeSpan.FromSeconds(1);
    private const int MaxMembersPerRoom = 10;
    private const int CodeLength = 6;

    private string GenerateCode()
    {
        Span<char> code = stackalloc char[CodeLength];
        for (var attempt = 0; attempt < 100; attempt++)
        {
            for (var i = 0; i < CodeLength; i++)
                code[i] = CodeChars[Random.Shared.Next(CodeChars.Length)];

            var candidate = new string(code);
            if (!_rooms.ContainsKey(candidate))
                return candidate;
        }
        // Extremely unlikely — 32^6 = ~1 billion possible codes
        throw new InvalidOperationException("Failed to generate unique room code after 100 attempts");
    }

    public SessionRoom CreateRoom(Guid userId, string connectionId, string firstName, string? lastName, string? avatar)
    {
        var code = GenerateCode();
        var room = new SessionRoom
        {
            RoomCode = code,
            HostUserId = userId,
            HostConnectionId = connectionId,
        };

        room.Members[userId] = new SessionMember
        {
            UserId = userId,
            ConnectionId = connectionId,
            FirstName = firstName,
            LastName = lastName,
            Avatar = avatar,
            IsHost = true,
        };

        _rooms[code] = room;
        return room;
    }

    public SessionRoom? JoinRoom(string code, Guid userId, string connectionId, string firstName, string? lastName, string? avatar)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return null;

        if (room.Members.Count >= MaxMembersPerRoom)
            return null;

        // If user is already in the room, treat as rejoin
        if (room.Members.ContainsKey(userId))
            return RejoinRoom(code, userId, connectionId);

        room.Members[userId] = new SessionMember
        {
            UserId = userId,
            ConnectionId = connectionId,
            FirstName = firstName,
            LastName = lastName,
            Avatar = avatar,
            IsHost = false,
        };

        room.LastActivity = DateTime.UtcNow;
        return room;
    }

    public (bool RoomDestroyed, bool WasHost) LeaveRoom(string code, Guid userId)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return (false, false);

        var wasHost = room.HostUserId == userId;
        room.Members.TryRemove(userId, out _);

        if (room.Members.IsEmpty)
        {
            _rooms.TryRemove(code.ToUpperInvariant(), out _);
            return (true, wasHost);
        }

        if (wasHost)
            room.HostDisconnectedAt = DateTime.UtcNow;

        room.LastActivity = DateTime.UtcNow;
        return (false, wasHost);
    }

    public SessionRoom? RejoinRoom(string code, Guid userId, string newConnectionId)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return null;

        if (!room.Members.TryGetValue(userId, out var member))
            return null;

        member.ConnectionId = newConnectionId;

        if (room.HostUserId == userId)
        {
            room.HostConnectionId = newConnectionId;
            room.HostDisconnectedAt = DateTime.MinValue;
        }

        room.LastActivity = DateTime.UtcNow;
        return room;
    }

    public bool KickMember(string code, Guid hostUserId, Guid targetUserId)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return false;

        if (room.HostUserId != hostUserId)
            return false;

        if (targetUserId == hostUserId)
            return false;

        return room.Members.TryRemove(targetUserId, out _);
    }

    public bool UpdatePlayback(string code, Guid hostUserId, PlaybackStateDto state)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return false;

        if (room.HostUserId != hostUserId)
            return false;

        room.CurrentPlayback = state;
        room.LastActivity = DateTime.UtcNow;
        return true;
    }

    public bool UpdateQueue(string code, Guid hostUserId, QueueStateDto queue)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return false;

        if (room.HostUserId != hostUserId)
            return false;

        room.CurrentQueue = queue;
        room.LastActivity = DateTime.UtcNow;
        return true;
    }

    public bool ValidateChatRate(string code, Guid userId)
    {
        if (!_rooms.TryGetValue(code.ToUpperInvariant(), out var room))
            return false;

        if (!room.Members.TryGetValue(userId, out var member))
            return false;

        var now = DateTime.UtcNow;
        if (now - member.LastChatMessage < ChatRateLimit)
            return false;

        member.LastChatMessage = now;
        room.LastActivity = now;
        return true;
    }

    public List<string> CleanupExpiredRooms()
    {
        var now = DateTime.UtcNow;
        var expired = new List<string>();

        foreach (var (code, room) in _rooms)
        {
            var shouldDestroy =
                room.Members.IsEmpty ||
                (room.HostDisconnectedAt != DateTime.MinValue && now - room.HostDisconnectedAt > HostTimeoutDuration) ||
                (now - room.LastActivity > InactivityTimeout);

            if (shouldDestroy)
            {
                _rooms.TryRemove(code, out _);
                expired.Add(code);
            }
        }

        return expired;
    }

    public SessionRoom? GetRoom(string code)
    {
        _rooms.TryGetValue(code.ToUpperInvariant(), out var room);
        return room;
    }

    public SessionRoom? GetRoomByConnection(string connectionId)
    {
        return _rooms.Values.FirstOrDefault(r =>
            r.Members.Values.Any(m => m.ConnectionId == connectionId));
    }
}
