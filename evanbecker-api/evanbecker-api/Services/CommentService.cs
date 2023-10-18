using evanbecker_api.Services.Interfaces;
using evanbecker_domain;
using evanbecker_domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Services;

public class CommentService : ICommentService
{
    private readonly ApplicationContext _context;

    public CommentService(ApplicationContext context)
    {
        _context = context;
    }

    public async Task<Comment> AddCommentAsync(User? user, string targetLocation, string commentText)
    {
        
        var comment = new Comment
        {
            Replies = new List<Reply?>(),
            Author = user,
            Published = DateTime.Now.ToUniversalTime(),
            CommentText = commentText,
            IsDeleted = false,
            TargetLocation = targetLocation
        };
        var savedComment = await _context.Comments.AddAsync(comment);
        await _context.SaveChangesAsync();
        return savedComment.Entity;
    }
    
    public async Task<Reply?> AddReplyAsync(User? user, Guid commentId, string targetLocation, string commentText)
    {
        var comment = await _context
            .Comments
            .Include(x => x.Replies)
            .SingleOrDefaultAsync(x => x.Id == commentId);

        if (comment == null)
            return null;
        
        var reply = new Reply
        {
            Author = user,
            Published = DateTime.Now.ToUniversalTime(),
            IsDeleted = false,
            CommentText = commentText,
            TargetLocation = targetLocation
        };
        
        if (comment.Replies.Any())
        {
            comment.Replies.Add(reply);
        }
        else
        {
            comment.Replies = new List<Reply?> { reply };
        }

        await _context.SaveChangesAsync();
        return reply;
    }
    
    public Task<List<Comment>> GetCommentsAsync(string targetLocation)
    {
        return _context
            .Comments
            .Include(x => x.Author)
            .Include(x => x.Replies)
            .ThenInclude(x => x.Author)
            .Select(comment => new Comment
            {
                Author = comment.Author,
                TargetLocation = comment.TargetLocation,
                Published = comment.Published,
                CommentText = comment.CommentText,
                IsDeleted = comment.IsDeleted,
                Id = comment.Id,
                Replies = comment.Replies.Where(reply => reply != null && !reply.IsDeleted).ToList()
            })
            .OrderBy(x => x.Published)
            .Where(x => x.TargetLocation == targetLocation)
            .Where(x => !x.IsDeleted)
            .ToListAsync();
    }

    public async Task<CommentBase?> DeleteCommentAsync(User? currentUser, Guid id)
    {
        var comment = await _context.Comments.SingleOrDefaultAsync(x => x.Id == id);

        if (comment == null)
        {
            return await DeleteReplyAsync(currentUser, id);
        }

        if (!HasRightsToChangeComment(currentUser, comment))
        {
            return null;
        }

        comment.IsDeleted = true;
        var removedComment = _context.Comments.Update(comment);
        await _context.SaveChangesAsync();
        return removedComment.Entity;
    }

    private async Task<CommentBase?> DeleteReplyAsync(User? currentUser, Guid id)
    {
        var reply = await _context.Replies.SingleOrDefaultAsync(x => x.Id == id);

        if (reply == null)
            return null;

        if (!HasRightsToChangeComment(currentUser, reply))
            return null;

        reply.IsDeleted = true;
        var removedReply = _context.Replies.Update(reply);
        await _context.SaveChangesAsync();
        return removedReply.Entity;
    }

    private static bool HasRightsToChangeComment(User? currentUser, CommentBase comment)
    {
        return comment.Author?.Id == currentUser?.Id ||
               currentUser?.IsAdmin == true || 
               currentUser?.IsOwner == true;
    }
}