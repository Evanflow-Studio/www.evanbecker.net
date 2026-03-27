using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace evanbecker_domain.Entities;

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

    // Spotify integration
    public string? SpotifyAccessToken { get; set; }
    public string? SpotifyRefreshToken { get; set; }
    public DateTime? SpotifyTokenExpiry { get; set; }
    public bool SpotifyPremium { get; set; }

    [MaxLength(255)]
    public string? SpotifyDisplayName { get; set; }
}