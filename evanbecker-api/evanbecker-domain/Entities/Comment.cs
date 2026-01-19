using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace evanbecker_domain.Entities;

public class CommentBase
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid? Id { get; set; }
    
    public DateTimeOffset Published { get; set; }
    
    public required User Author { get; set; }
    
    [MaxLength(255)]
    public required string CommentText { get; set; }
    
    [MaxLength(255)]
    public required string TargetLocation { get; set; } // The Unique Url that this Comment will Show Up
    
    public bool IsDeleted { get; set; }
}

public class Comment : CommentBase
{
    public List<Reply> Replies { get; set; } = [];
}

public class Reply : CommentBase { }