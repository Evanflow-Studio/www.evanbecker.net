using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace evanbecker_api.Tests.Guard;

/// <summary>One method on one route, as the running API serves it.</summary>
/// <param name="Key">The method and route, such as <c>GET /api/v1/user</c>. <c>*</c> means any method.</param>
/// <param name="Handler">The action or route handler, or null for an endpoint with no handler to read (a hub, the health check).</param>
/// <param name="Described">Whether ApiExplorer, and so Swagger, describes it.</param>
/// <param name="ReturnType">The handler's return type, with Task, ValueTask and ActionResult unwrapped.</param>
/// <param name="Bodies">Every response body type declared for it, by its return type, attributes or metadata.</param>
public sealed record ApiEndpoint(
    string Key,
    string Method,
    RouteEndpoint Endpoint,
    MethodInfo? Handler,
    bool RequiresSignIn,
    bool Described,
    Type? ReturnType,
    IReadOnlyList<Type> Bodies)
{
    public bool AllowsGet => Method is "GET" or "*";

    /// <summary>Every endpoint the running API serves, from its endpoint data source, with ApiExplorer's description of each.</summary>
    public static IReadOnlyList<ApiEndpoint> All(IServiceProvider services)
    {
        var descriptions = services.GetRequiredService<IApiDescriptionGroupCollectionProvider>()
            .ApiDescriptionGroups.Items.SelectMany(group => group.Items).ToList();

        var endpoints = new List<ApiEndpoint>();
        foreach (var endpoint in services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>())
        {
            var metadata = endpoint.Metadata;
            var action = metadata.GetMetadata<ControllerActionDescriptor>();
            var handler = action?.MethodInfo ?? metadata.GetMetadata<MethodInfo>();
            var requiresSignIn = metadata.GetMetadata<IAuthorizeData>() != null && metadata.GetMetadata<IAllowAnonymous>() == null;
            var route = "/" + (endpoint.RoutePattern.RawText ?? "").TrimStart('/');
            var methods = metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods is { Count: > 0 } listed ? listed : ["*"];

            foreach (var method in methods)
            {
                var described = descriptions.Where(d => SameHandler(d, action, handler) &&
                    (d.HttpMethod == null || string.Equals(d.HttpMethod, method, StringComparison.OrdinalIgnoreCase))).ToList();
                var returnType = handler == null ? null : Unwrap(handler.ReturnType);
                // Every declared body is walked, opaque ones included. An opaque return type (IActionResult,
                // object) says nothing about the body by itself, so Undeclared() reports it when nothing is declared.
                var bodies = described.SelectMany(d => d.SupportedResponseTypes).Select(r => r.Type)
                    .Concat(DeclaredResponses(metadata))
                    .Append(returnType != null && PersonalData.Opaque(returnType) == null ? returnType : null)
                    .OfType<Type>()
                    .Where(type => type != typeof(void))
                    .Distinct()
                    .ToList();
                endpoints.Add(new ApiEndpoint($"{method} {route}", method, endpoint, handler, requiresSignIn,
                    described.Count > 0, returnType, bodies));
            }
        }
        return endpoints;
    }

    /// <summary>
    /// Whether the handler's body can be known from its declarations: a typed return, or an opaque one (an action result,
    /// <c>object</c>) with every response type declared on it.
    /// </summary>
    public string? Undeclared()
    {
        if (Handler == null || ReturnType == null || ReturnType == typeof(void)) return null;
        if (PersonalData.Opaque(ReturnType) is not { } why) return null;
        var declared = Endpoint.Metadata.Any(m => m is IProducesResponseTypeMetadata or IApiResponseMetadataProvider);
        return declared ? null : $"returns {PersonalData.FriendlyName(ReturnType)}, {why}, and declares no response types";
    }

    /// <summary>
    /// The response types declared in metadata: <c>[ProducesResponseType]</c> on a controller action, and
    /// <c>Produces&lt;T&gt;()</c> or a typed result on a route handler.
    /// </summary>
    private static IEnumerable<Type?> DeclaredResponses(EndpointMetadataCollection metadata) =>
        metadata.OfType<IApiResponseMetadataProvider>().Select(m => m.Type)
            .Concat(metadata.OfType<IProducesResponseTypeMetadata>().Select(m => m.Type));

    private static bool SameHandler(ApiDescription description, ControllerActionDescriptor? action, MethodInfo? handler) =>
        action != null
            ? description.ActionDescriptor.Id == action.Id
            : handler != null && description.ActionDescriptor.EndpointMetadata.OfType<MethodInfo>().Contains(handler);

    /// <summary>Task&lt;T&gt;, ValueTask&lt;T&gt; and ActionResult&lt;T&gt; become T; Task and ValueTask become void.</summary>
    private static Type Unwrap(Type type)
    {
        if (type == typeof(Task) || type == typeof(ValueTask)) return typeof(void);
        if (type.IsGenericType)
        {
            var definition = type.GetGenericTypeDefinition();
            if (definition == typeof(Task<>) || definition == typeof(ValueTask<>) || definition == typeof(ActionResult<>))
                return Unwrap(type.GetGenericArguments()[0]);
        }
        return type;
    }
}
