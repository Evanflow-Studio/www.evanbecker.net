using System.Collections;
using System.Dynamic;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace evanbecker_api.Tests.Guard;

/// <summary>What the guard counts as personal data in a response, and how it reads a response type.</summary>
public static partial class PersonalData
{
    /// <summary>
    /// Names that mark personal data, or something that grants access, in a property or a JSON key. A name matches
    /// when one of these appears among its words, singular or plural: <c>EmailAddress</c>, <c>userEmails</c>,
    /// <c>IPAddress</c> and <c>auth0Id</c> match, and <c>Description</c> and <c>Subject</c> don't. <c>Auth0</c>
    /// covers <c>Auth0Id</c> and any other Auth0 identifier.
    /// </summary>
    public static readonly string[] DeniedNames =
        ["Email", "Auth0", "Sub", "IsAdmin", "IsOwner", "Role", "Password", "Token", "Secret", "Ip", "Phone", "Address"];

    /// <summary>An email address anywhere in a response body.</summary>
    public static readonly Regex EmailShaped = EmailRegex();

    /// <summary>The denied name that <paramref name="name"/> matches, or null.</summary>
    public static string? DeniedName(string name)
    {
        var words = Words(name);
        foreach (var denied in DeniedNames)
        {
            var parts = Words(denied);
            for (var start = 0; start + parts.Count <= words.Count; start++)
            {
                var match = true;
                for (var i = 0; i < parts.Count && match; i++)
                {
                    var word = words[start + i];
                    var part = parts[i];
                    match = word == part || (i == parts.Count - 1 && (word == part + "s" || word == part + "es"));
                }
                if (match) return denied;
            }
        }
        return null;
    }

    /// <summary>A name's words, lower case: <c>IPAddress</c> is ip, address; <c>auth0Id</c> is auth0, id.</summary>
    public static List<string> Words(string name) =>
        WordRegex().Matches(name).Select(m => m.Value.ToLowerInvariant()).ToList();

    /// <summary>
    /// Everything wrong with <paramref name="type"/> as a response body, as paths into it: an entity from
    /// evanbecker-domain, a type whose JSON can't be known from the type, or a member whose name is denied.
    /// </summary>
    public static List<string> Problems(Type type)
    {
        var found = new List<string>();
        Walk(type, FriendlyName(type), found, []);
        return found;
    }

    /// <summary>Why a body of this type can't be checked from its type alone, or null when it can.</summary>
    public static string? Opaque(Type type)
    {
        if (type == typeof(object)) return "object, whose JSON can be anything";
        if (typeof(IActionResult).IsAssignableFrom(type) || typeof(IResult).IsAssignableFrom(type))
            return "an action result with no declared body type";
        if (typeof(JsonNode).IsAssignableFrom(type) || type == typeof(JsonElement) || type == typeof(JsonDocument))
            return "raw JSON";
        if (typeof(IDynamicMetaObjectProvider).IsAssignableFrom(type)) return "a dynamic object";
        if (IsAnonymous(type)) return "an anonymous type";
        if (typeof(Stream).IsAssignableFrom(type)) return "a stream";
        if (IsDictionary(type)) return "a dictionary, whose keys can't be checked";
        return null;
    }

    private static readonly Assembly Domain = typeof(evanbecker_domain.ApplicationContext).Assembly;

    private static void Walk(Type type, string path, List<string> found, HashSet<Type> seen)
    {
        type = Nullable.GetUnderlyingType(type) ?? type;
        if (IsLeaf(type)) return;
        if (type.Assembly == Domain)
        {
            found.Add($"{path} is {FriendlyName(type)}, an entity from evanbecker-domain");
            return;
        }
        if (Opaque(type) is { } why)
        {
            found.Add($"{path} is {why}");
            return;
        }
        if (ElementType(type) is { } element)
        {
            Walk(element, path + "[]", found, seen);
            return;
        }
        if (!seen.Add(type)) return;

        foreach (var derived in type.GetCustomAttributes<JsonDerivedTypeAttribute>())
            Walk(derived.DerivedType, $"{path}<{FriendlyName(derived.DerivedType)}>", found, seen);

        foreach (var member in SerializedMembers(type))
        {
            var memberPath = $"{path}.{member.Name}";
            var jsonName = member.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name;
            foreach (var name in new[] { member.Name, jsonName }.OfType<string>().Distinct())
                if (DeniedName(name) is { } denied)
                    found.Add($"{memberPath} matches the denied name {denied}");
            if (member.IsDefined(typeof(JsonExtensionDataAttribute)))
                found.Add($"{memberPath} is extension data, whose keys can't be checked");
            else
                Walk(MemberType(member), memberPath, found, seen);
        }
    }

    // The framework's error bodies: a status, a title and field errors, never a row.
    private static readonly Type[] FrameworkBodies = [typeof(ProblemDetails), typeof(ValidationProblemDetails)];

    private static bool IsLeaf(Type type) =>
        type.IsPrimitive || type.IsEnum || type == typeof(void) || type == typeof(string) || type == typeof(decimal) ||
        type == typeof(DateTime) || type == typeof(DateTimeOffset) || type == typeof(DateOnly) ||
        type == typeof(TimeOnly) || type == typeof(TimeSpan) || type == typeof(Guid) || type == typeof(Uri) ||
        FrameworkBodies.Contains(type);

    private static bool IsAnonymous(Type type) =>
        type.IsDefined(typeof(CompilerGeneratedAttribute), false) && type.Name.Contains("AnonymousType");

    private static bool IsDictionary(Type type) =>
        typeof(IDictionary).IsAssignableFrom(type) || type.GetInterfaces().Append(type).Any(i => i.IsGenericType &&
            (i.GetGenericTypeDefinition() == typeof(IDictionary<,>) || i.GetGenericTypeDefinition() == typeof(IReadOnlyDictionary<,>)));

    private static Type? ElementType(Type type)
    {
        if (type.IsArray) return type.GetElementType();
        if (type == typeof(string)) return null;
        var enumerable = type.GetInterfaces().Append(type)
            .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEnumerable<>));
        return enumerable?.GetGenericArguments()[0];
    }

    private static IEnumerable<MemberInfo> SerializedMembers(Type type)
    {
        bool Serialized(MemberInfo member) =>
            member.GetCustomAttribute<JsonIgnoreAttribute>() is not { Condition: JsonIgnoreCondition.Always };

        var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.GetMethod?.IsPublic == true && p.GetIndexParameters().Length == 0 && Serialized(p));
        var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance)
            .Where(f => f.IsDefined(typeof(JsonIncludeAttribute)) && Serialized(f));
        return properties.Cast<MemberInfo>().Concat(fields);
    }

    private static Type MemberType(MemberInfo member) =>
        member is PropertyInfo property ? property.PropertyType : ((FieldInfo)member).FieldType;

    public static string FriendlyName(Type type) =>
        type.IsGenericType
            ? $"{type.Name[..type.Name.IndexOf('`')]}<{string.Join(", ", type.GetGenericArguments().Select(FriendlyName))}>"
            : type.Name;

    [GeneratedRegex(@"[A-Z]+(?![a-z])\d*|[A-Z]?[a-z]+\d*|\d+")]
    private static partial Regex WordRegex();

    [GeneratedRegex(@"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")]
    private static partial Regex EmailRegex();
}
