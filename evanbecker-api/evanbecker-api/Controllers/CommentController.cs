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
    [HttpGet("{targetLocation}")]
    public async Task<IActionResult> GetCommentsAsync(string targetLocation)
    {
        var comments = await commentService.GetCommentsAsync(targetLocation);
        return Ok(comments);
    }

    [HttpPost("{targetLocation}")]
    [Authorize]
    public async Task<IActionResult> AddCommentAsync(string targetLocation, AddCommentDto addCommentText)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var newComment = await commentService.AddCommentAsync(user, targetLocation, addCommentText.CommentText);
        await commentHub.Clients.Group(targetLocation).SendAsync("NewComment", newComment);
        return Ok(newComment);
    }

    [HttpPost("{targetLocation}/reply/{commentId:guid}")]
    [Authorize]
    public async Task<IActionResult> AddReplyAsync(Guid commentId, string targetLocation, AddCommentDto addCommentText)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var newReply = await commentService.AddReplyAsync(user, commentId, targetLocation, addCommentText.CommentText);
        if (newReply == null) return NotFound();
        await commentHub.Clients.Group(targetLocation).SendAsync("NewReply", commentId.ToString(), newReply);
        return Ok(newReply);
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> SoftDeleteCommentOrReplyAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var deleted = await commentService.DeleteCommentAsync(user, id);
        if (deleted == null) return NotFound();
        return Ok(deleted);
    }
}
