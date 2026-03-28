namespace evanbecker_api.Dto;

public record SessionMemberDto(
    Guid UserId,
    string FirstName,
    string? LastName,
    string? Avatar,
    bool IsHost,
    bool IsReady);

public record PlaybackStateDto(
    string? VideoId,
    string? Title,
    string? Channel,
    string? Thumbnail,
    double CurrentTime,
    double Duration,
    bool IsPlaying);

public record QueueTrackDto(
    string VideoId,
    string Title,
    string Channel,
    string Thumbnail);

public record QueueStateDto(
    List<QueueTrackDto> Tracks,
    int CurrentIndex);

public record SessionStateDto(
    string RoomCode,
    SessionMemberDto Host,
    List<SessionMemberDto> Members,
    PlaybackStateDto? Playback,
    QueueStateDto? Queue);

public record ChatMessageDto(
    string SenderName,
    string? SenderAvatar,
    string Content,
    long Timestamp);
