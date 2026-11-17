using evanbecker_domain.Entities;

namespace evanbecker_api.Dto;

/// <summary>
/// An author as every reader sees them: a name and an avatar. Nothing from their account (email, Auth0 ID, roles)
/// goes into a comment payload, because the comments list is anonymous and the hub broadcasts to every reader.
/// </summary>
public record CommentAuthorDto(string? FirstName, string? LastName, string? Avatar)
{
    public static CommentAuthorDto From(User author) => new(author.FirstName, author.LastName, author.Avatar);
}

/// <summary>A reply, as the comment endpoints and the comments hub send it.</summary>
/// <param name="ByOwner">Written by the site's owner, which the page highlights.</param>
/// <param name="CanDelete">Whether the reader this payload was made for may delete it. Always false in a broadcast.</param>
public record ReplyDto(Guid? Id, DateTime Published, string CommentText, CommentAuthorDto Author, bool ByOwner, bool CanDelete);

/// <summary>A comment and its replies, as the comment endpoints and the comments hub send them.</summary>
/// <param name="ByOwner">Written by the site's owner, which the page highlights.</param>
/// <param name="CanDelete">Whether the reader this payload was made for may delete it. Always false in a broadcast.</param>
public record CommentDto(
    Guid? Id,
    DateTime Published,
    string CommentText,
    CommentAuthorDto Author,
    bool ByOwner,
    bool CanDelete,
    IReadOnlyList<ReplyDto> Replies);

/// <summary>Maps comment entities to what a given reader may see. A null reader is someone not signed in.</summary>
public static class CommentPayloads
{
    /// <summary>The comment's author, an admin and the owner may delete it.</summary>
    public static bool CanDelete(CommentBase item, User? reader) =>
        reader != null && (item.Author.Id == reader.Id || reader.IsAdmin || reader.IsOwner);

    public static ReplyDto Reply(Reply reply, User? reader) => new(
        reply.Id, reply.Published, reply.CommentText, CommentAuthorDto.From(reply.Author),
        reply.Author.IsOwner, CanDelete(reply, reader));

    public static CommentDto Comment(Comment comment, User? reader) => new(
        comment.Id, comment.Published, comment.CommentText, CommentAuthorDto.From(comment.Author),
        comment.Author.IsOwner, CanDelete(comment, reader),
        comment.Replies.Select(reply => Reply(reply, reader)).ToList());

    /// <summary>A comment or a reply, for the delete endpoint, which handles both.</summary>
    public static object Item(CommentBase item, User? reader) => item switch
    {
        Comment comment => Comment(comment, reader),
        Reply reply => Reply(reply, reader),
        _ => throw new ArgumentOutOfRangeException(nameof(item), item.GetType().Name, "Not a comment or a reply."),
    };
}
