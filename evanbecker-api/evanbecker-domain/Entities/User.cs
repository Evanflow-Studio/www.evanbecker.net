using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace evanbecker_domain.Entities;

public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public string? Auth0Id { get; set; }
    public string? Avatar { get; set; }
    public string? FirstName { get; set; }
    [JsonIgnore] public IEnumerable<Comment>? CreatedComments { get; set; }
    public string? Email { get; set; }
    public bool IsOwner { get; set; }
    public bool IsAdmin { get; set; }
    public string? LastName { get; set; }
}