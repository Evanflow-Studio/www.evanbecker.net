using evanbecker_api.Dto;
using evanbecker_api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Controllers;

[ApiController]
[Route("api/v1/comment")]
public class CommentController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ICommentService _commentService;

    public CommentController(IUserService userService,
        ICommentService commentService)
    {
        _userService = userService;
        _commentService = commentService;
    }

    [HttpGet("{targetLocation}")]
    public async Task<IActionResult> GetCommentsAsync(string targetLocation)
    {
        var comments = await _commentService.GetCommentsAsync(targetLocation);
        return Ok(comments);
    }

    [HttpPost("{targetLocation}")]
    [Authorize]
    public async Task<IActionResult> AddCommentAsync(string targetLocation, CommentDto commentText)
    {
        var user = await _userService.GetUser(User);
        var newComment = await _commentService.AddCommentAsync(user, targetLocation, commentText.CommentText);
        return Ok(newComment);
    }
    
    [HttpPost("{targetLocation}/reply/{commentId:guid}")]
    public async Task<IActionResult> AddReplyAsync(Guid commentId, string targetLocation, CommentDto commentText)
    {
        var user = await _userService.GetUser(User);
        var newReply = await _commentService.AddReplyAsync(user, commentId, targetLocation, commentText.CommentText);
        if (newReply == null)
            return NotFound();
        return Ok(newReply);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDeleteCommentOrReplyAsync(Guid id)
    {
        var user = await _userService.GetUser(User);
        var deleted = await _commentService.DeleteCommentAsync(user, id);
        if (deleted == null)
            return NotFound();
        return Ok(deleted);
    }
}