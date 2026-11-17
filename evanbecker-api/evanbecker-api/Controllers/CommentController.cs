using evanbecker_api.Dto;
using evanbecker_api.Hubs;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/comment")]
public class CommentController(
    IUserService userService,
    ICommentService commentService,
    IHubContext<CommentHub> commentHub)
    : ControllerBase
{
    /// <summary>
    /// Anyone may read comments. Authors appear by name and avatar only (<see cref="CommentPayloads"/>). A signed-in
    /// reader's token, when sent, decides which comments come back marked as theirs to delete.
    /// </summary>
    [HttpGet("{targetLocation}")]
    public async Task<IActionResult> GetCommentsAsync(string targetLocation)
    {
        var comments = await commentService.GetCommentsAsync(targetLocation);
        var reader = User.Identity?.IsAuthenticated == true ? await userService.GetUserAsync(User) : null;
        return Ok(comments.Select(comment => CommentPayloads.Comment(comment, reader)).ToList());
    }

    [HttpPost("{targetLocation}")]
    [Authorize]
    public async Task<IActionResult> AddCommentAsync(string targetLocation, AddCommentDto addCommentText)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var newComment = await commentService.AddCommentAsync(user, targetLocation, addCommentText.CommentText);
        // Every reader of the page gets the broadcast, so it's made for no one in particular.
        await commentHub.Clients.Group(targetLocation).SendAsync("NewComment", CommentPayloads.Comment(newComment, reader: null));
        return Ok(CommentPayloads.Comment(newComment, user));
    }

    [HttpPost("{targetLocation}/reply/{commentId:guid}")]
    [Authorize]
    public async Task<IActionResult> AddReplyAsync(Guid commentId, string targetLocation, AddCommentDto addCommentText)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var newReply = await commentService.AddReplyAsync(user, commentId, targetLocation, addCommentText.CommentText);
        if (newReply == null) return NotFound();
        await commentHub.Clients.Group(targetLocation).SendAsync("NewReply", commentId.ToString(), CommentPayloads.Reply(newReply, reader: null));
        return Ok(CommentPayloads.Reply(newReply, user));
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> SoftDeleteCommentOrReplyAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var deleted = await commentService.DeleteCommentAsync(user, id);
        if (deleted == null) return NotFound();
        return Ok(CommentPayloads.Item(deleted, user));
    }
}
