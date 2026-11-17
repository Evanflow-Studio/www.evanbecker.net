using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_domain.Entities;

[Index(nameof(Auth0Id), IsUnique = true)]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [MaxLength(255)]
    public string? Auth0Id { get; set; }
    
    public string? Avatar { get; set; }
    
    [MaxLength(255)]
    public string? FirstName { get; set; }
    
    [JsonIgnore] 
    public IEnumerable<Comment>? CreatedComments { get; set; }
    
    [MaxLength(255)]
    public string? Email { get; set; }
    
    public bool IsOwner { get; set; }
    
    public bool IsAdmin { get; set; }

    [MaxLength(255)]
    public string? LastName { get; set; }

    /// <summary>
    /// The user asked for newsletter and update emails on the account page. Off until they turn it on;
    /// nothing sends them yet. Kept out of this entity's JSON because comment payloads serialize the
    /// user as their author: the user reads it through <c>CurrentUserDto</c>.
    /// </summary>
    [JsonIgnore]
    public bool NewsletterOptIn { get; set; }
}