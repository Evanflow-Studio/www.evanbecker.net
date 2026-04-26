using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Services;

public interface ICommentService
{
    Task<Reply?> AddReplyAsync(User user, Guid commentId, string targetLocation, string commentText);
    Task<List<Comment>> GetCommentsAsync(string targetLocation);
    Task<CommentBase?> DeleteCommentAsync(User currentUser, Guid id);
    Task<Comment> AddCommentAsync(User user, string targetLocation, string commentText);
}

public class CommentService(ApplicationContext context) : ICommentService
{
    public async Task<Comment> AddCommentAsync(User user, string targetLocation, string commentText)
    {
        var comment = new Comment
        {
            Author         = user,
            Published      = DateTime.UtcNow,
            CommentText    = commentText,
            TargetLocation = targetLocation
        };
        var saved = await context.Comments.AddAsync(comment);
        await context.SaveChangesAsync();
        return saved.Entity;
    }

    public async Task<Reply?> AddReplyAsync(User user, Guid commentId, string targetLocation, string commentText)
    {
        var comment = await context.Comments
            .Include(x => x.Replies)
            .SingleOrDefaultAsync(x => x.Id == commentId);

        if (comment == null)
            return null;

        var reply = new Reply
        {
            Author         = user,
            Published      = DateTime.UtcNow,
            CommentText    = commentText,
            TargetLocation = targetLocation
        };

        comment.Replies.Add(reply);
        await context.SaveChangesAsync();
        return reply;
    }

    public Task<List<Comment>> GetCommentsAsync(string targetLocation)
    {
        return context.Comments
            .Include(x => x.Author)
            .Include(x => x.Replies)
            .ThenInclude(x => x.Author)
            .Where(x => x.TargetLocation == targetLocation && !x.IsDeleted)
            .OrderBy(x => x.Published)
            .Select(comment => new Comment
            {
                Author         = comment.Author,
                TargetLocation = comment.TargetLocation,
                Published      = comment.Published,
                CommentText    = comment.CommentText,
                IsDeleted      = comment.IsDeleted,
                Id             = comment.Id,
                Replies        = comment.Replies.Where(r => !r.IsDeleted).ToList()
            })
            .ToListAsync();
    }

    public async Task<CommentBase?> DeleteCommentAsync(User currentUser, Guid id)
    {
        var comment = await context.Comments.SingleOrDefaultAsync(x => x.Id == id);

        if (comment == null)
            return await DeleteReplyAsync(currentUser, id);

        if (!HasRightsToChangeComment(currentUser, comment))
            return null;

        comment.IsDeleted = true;
        context.Comments.Update(comment);
        await context.SaveChangesAsync();
        return comment;
    }

    private async Task<CommentBase?> DeleteReplyAsync(User currentUser, Guid id)
    {
        var reply = await context.Replies.SingleOrDefaultAsync(x => x.Id == id);

        if (reply == null)
            return null;

        if (!HasRightsToChangeComment(currentUser, reply))
            return null;

        reply.IsDeleted = true;
        context.Replies.Update(reply);
        await context.SaveChangesAsync();
        return reply;
    }

    private static bool HasRightsToChangeComment(User currentUser, CommentBase comment) =>
        comment.Author?.Id == currentUser.Id ||
        currentUser.IsAdmin ||
        currentUser.IsOwner;
}
