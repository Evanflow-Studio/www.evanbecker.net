using System.Security.Claims;
using System.Text.Json;
using evanbecker_api.Controllers;
using evanbecker_api.Dto;
using evanbecker_api.Hubs;
using evanbecker_api.Services;
using evanbecker_domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace evanbecker_api.Tests;

/// <summary>
/// Comment payloads reach anyone reading a page, signed in or not: the GET is anonymous and the hub broadcasts to
/// every reader. These tests serialize exactly what each endpoint and broadcast sends, with ASP.NET's web JSON
/// options, and check that an author appears only as a name and an avatar.
/// </summary>
public class CommentPayloadTests
{
    private static readonly string[] DisplayFields = ["firstName", "lastName", "avatar"];
    private static readonly string[] AccountFields = ["email", "auth0Id", "isAdmin", "isOwner", "createdComments"];

    private static User Ada() => new()
    {
        Id = Guid.NewGuid(), Auth0Id = "auth0|ada", Email = "ada@example.com", FirstName = "Ada",
        LastName = "Lovelace", Avatar = "data:image/png;base64,AAAA", IsAdmin = true, IsOwner = true,
    };

    private static User Grace() => new()
    {
        Id = Guid.NewGuid(), Auth0Id = "auth0|grace", Email = "grace@example.com", FirstName = "Grace",
        LastName = "Hopper", IsAdmin = false, IsOwner = false,
    };

    [Fact]
    public async Task The_comments_list_shows_authors_by_name_and_avatar_only()
    {
        var (controller, _) = Controller(viewer: null);

        var result = await controller.GetCommentsAsync("the-wall");

        AssertDisplayOnly(Body(result));
    }

    [Fact]
    public async Task A_new_comment_shows_its_author_by_name_and_avatar_only_in_the_response_and_the_broadcast()
    {
        var (controller, hub) = Controller(viewer: Grace());

        var result = await controller.AddCommentAsync("the-wall", new AddCommentDto { CommentText = "Hello" });

        AssertDisplayOnly(Body(result));
        var broadcast = Assert.Single(hub.Sent);
        Assert.Equal("NewComment", broadcast.Method);
        AssertDisplayOnly(JsonSerializer.SerializeToElement(broadcast.Args, JsonSerializerOptions.Web));
    }

    [Fact]
    public async Task A_new_reply_shows_its_author_by_name_and_avatar_only_in_the_response_and_the_broadcast()
    {
        var (controller, hub) = Controller(viewer: Grace());

        var result = await controller.AddReplyAsync(Guid.NewGuid(), "the-wall", new AddCommentDto { CommentText = "Hi" });

        AssertDisplayOnly(Body(result));
        var broadcast = Assert.Single(hub.Sent);
        Assert.Equal("NewReply", broadcast.Method);
        AssertDisplayOnly(JsonSerializer.SerializeToElement(broadcast.Args, JsonSerializerOptions.Web));
    }

    [Fact]
    public async Task A_deleted_comment_comes_back_without_its_authors_account_details()
    {
        var (controller, _) = Controller(viewer: Ada());

        var result = await controller.SoftDeleteCommentOrReplyAsync(Guid.NewGuid());

        AssertDisplayOnly(Body(result));
    }

    [Fact]
    public async Task A_reader_who_isnt_signed_in_can_delete_nothing()
    {
        var (controller, _) = Controller(viewer: null);

        var comment = Assert.Single(Comments(await controller.GetCommentsAsync("the-wall")));

        Assert.False(comment.CanDelete);
        Assert.False(Assert.Single(comment.Replies).CanDelete);
    }

    [Fact]
    public async Task A_signed_in_reader_can_delete_their_own_and_nobody_elses()
    {
        var ada = Ada();
        var grace = Grace();
        var (controller, _) = Controller(viewer: grace, ada, grace);

        var comment = Assert.Single(Comments(await controller.GetCommentsAsync("the-wall")));

        Assert.False(comment.CanDelete);
        Assert.True(Assert.Single(comment.Replies).CanDelete);
    }

    [Fact]
    public async Task An_admin_or_the_owner_can_delete_anything()
    {
        var ada = Ada();
        var (controller, _) = Controller(viewer: ada, ada, Grace());

        var comment = Assert.Single(Comments(await controller.GetCommentsAsync("the-wall")));

        Assert.True(comment.CanDelete);
        Assert.True(Assert.Single(comment.Replies).CanDelete);
    }

    [Fact]
    public async Task The_poster_can_delete_their_new_comment_but_the_broadcast_marks_it_for_no_one()
    {
        var grace = Grace();
        var (controller, hub) = Controller(viewer: grace, Ada(), grace);

        var result = await controller.AddCommentAsync("the-wall", new AddCommentDto { CommentText = "Hello" });

        Assert.True(Assert.IsType<CommentDto>(Assert.IsAssignableFrom<ObjectResult>(result).Value).CanDelete);
        Assert.False(Assert.IsType<CommentDto>(Assert.Single(Assert.Single(hub.Sent).Args)).CanDelete);
    }

    [Fact]
    public async Task The_owners_comments_are_marked_for_the_highlight()
    {
        var (controller, _) = Controller(viewer: null);

        var comment = Assert.Single(Comments(await controller.GetCommentsAsync("the-wall")));

        Assert.True(comment.ByOwner);
        Assert.False(Assert.Single(comment.Replies).ByOwner);
    }

    // ---- helpers

    private static (CommentController Controller, CapturingHub Hub) Controller(User? viewer, User? ada = null, User? grace = null)
    {
        var hub = new CapturingHub();
        var principal = viewer == null
            ? new ClaimsPrincipal(new ClaimsIdentity())
            : new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, viewer.Auth0Id!)], "test"));
        var controller = new CommentController(new FakeUsers(viewer), new FakeComments(ada ?? Ada(), grace ?? Grace()), hub)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } },
        };
        return (controller, hub);
    }

    private static List<CommentDto> Comments(IActionResult result) =>
        Assert.IsType<List<CommentDto>>(Assert.IsAssignableFrom<ObjectResult>(result).Value);

    private static JsonElement Body(IActionResult result) =>
        JsonSerializer.SerializeToElement(Assert.IsAssignableFrom<ObjectResult>(result).Value, JsonSerializerOptions.Web);

    /// <summary>Every author object holds display fields only, and no account field appears anywhere.</summary>
    private static void AssertDisplayOnly(JsonElement payload)
    {
        var authors = 0;
        Walk(payload, (name, value) =>
        {
            Assert.DoesNotContain(name, AccountFields);
            if (name != "author" || value.ValueKind != JsonValueKind.Object) return;
            authors++;
            foreach (var field in value.EnumerateObject())
                Assert.Contains(field.Name, DisplayFields);
        });
        Assert.True(authors > 0, $"no author in the payload: {payload}");
    }

    private static void Walk(JsonElement element, Action<string, JsonElement> visit)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    visit(property.Name, property.Value);
                    Walk(property.Value, visit);
                }
                break;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray()) Walk(item, visit);
                break;
        }
    }

    private sealed class FakeUsers(User? viewer) : IUserService
    {
        public Task<User?> GetUserAsync(ClaimsPrincipal claimsUser) => Task.FromResult(viewer);
        public Task<(User? User, bool IsNew)> SyncUserAsync(ClaimsPrincipal claimsUser, SyncUserDto dto) =>
            throw new NotSupportedException();
        public Task<User?> UpdateUserAsync(ClaimsPrincipal claimsUser, UpdateUserDto dto) =>
            throw new NotSupportedException();
    }

    private sealed class FakeComments(User ada, User grace) : ICommentService
    {
        private Comment Comment(User author) => new()
        {
            Id = Guid.NewGuid(), Author = author, CommentText = "A comment", TargetLocation = "the-wall",
            Published = new DateTime(2026, 11, 17, 8, 0, 0, DateTimeKind.Utc),
            Replies = [new Reply
            {
                Id = Guid.NewGuid(), Author = grace, CommentText = "A reply", TargetLocation = "the-wall",
                Published = new DateTime(2026, 11, 17, 9, 0, 0, DateTimeKind.Utc),
            }],
        };

        public Task<List<Comment>> GetCommentsAsync(string targetLocation) => Task.FromResult(new List<Comment> { Comment(ada) });

        public Task<Comment> AddCommentAsync(User user, string targetLocation, string commentText) =>
            Task.FromResult(Comment(user));

        public Task<Reply?> AddReplyAsync(User user, Guid commentId, string targetLocation, string commentText) =>
            Task.FromResult<Reply?>(new Reply
            {
                Id = Guid.NewGuid(), Author = user, CommentText = commentText, TargetLocation = targetLocation,
                Published = new DateTime(2026, 11, 17, 10, 0, 0, DateTimeKind.Utc),
            });

        public Task<CommentBase?> DeleteCommentAsync(User currentUser, Guid id) =>
            Task.FromResult<CommentBase?>(Comment(grace));
    }

    /// <summary>Records every message the controller sends through the comments hub.</summary>
    internal sealed class CapturingHub : IHubContext<CommentHub>
    {
        public List<(string Method, object?[] Args)> Sent { get; } = [];
        public IHubClients Clients => new HubClients(this);
        public IGroupManager Groups => throw new NotSupportedException();

        private sealed class HubClients(CapturingHub hub) : IHubClients
        {
            private Proxy P => new(hub);
            public IClientProxy All => P;
            public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => P;
            public ISingleClientProxy Client(string connectionId) => P;
            IClientProxy IHubClients<IClientProxy>.Client(string connectionId) => P;
            public IClientProxy Clients(IReadOnlyList<string> connectionIds) => P;
            public IClientProxy Group(string groupName) => P;
            public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => P;
            public IClientProxy Groups(IReadOnlyList<string> groupNames) => P;
            public IClientProxy User(string userId) => P;
            public IClientProxy Users(IReadOnlyList<string> userIds) => P;
        }

        private sealed class Proxy(CapturingHub hub) : ISingleClientProxy
        {
            public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
            {
                hub.Sent.Add((method, args));
                return Task.CompletedTask;
            }

            public Task<T> InvokeCoreAsync<T>(string method, object?[] args, CancellationToken cancellationToken) =>
                throw new NotSupportedException();
        }
    }
}
