using evanbecker_api.Dto;
using evanbecker_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/comment")]
public class CommentController(
    IUserService userService,
    ICommentService commentService)
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
        return Ok(newComment);
    }
    
    [HttpPost("{targetLocation}/reply/{commentId:guid}")]
    public async Task<IActionResult> AddReplyAsync(Guid commentId, string targetLocation, AddCommentDto addCommentText)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var newReply = await commentService.AddReplyAsync(user, commentId, targetLocation, addCommentText.CommentText);
        if (newReply == null) return NotFound();
        return Ok(newReply);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDeleteCommentOrReplyAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var deleted = await commentService.DeleteCommentAsync(user, id);
        if (deleted == null) return NotFound();
        return Ok(deleted);
    }
}