using evanbecker_domain.Entities;

namespace evanbecker_api.Services.Interfaces;

public interface ICommentService
{
    Task<Reply?> AddReplyAsync(User? user, Guid commentId, string targetLocation, string commentText);
    Task<List<Comment>> GetCommentsAsync(string targetLocation);
    Task<CommentBase?> DeleteCommentAsync(User? currentUser, Guid id);
    Task<Comment> AddCommentAsync(User? user, string targetLocation, string commentText);
}