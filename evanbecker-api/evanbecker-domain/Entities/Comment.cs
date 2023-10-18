using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace evanbecker_domain.Entities;

public class CommentBase
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    public DateTime Published { get; set; }
    public User? Author { get; set; }
    public string? CommentText { get; set; }
    public string? TargetLocation { get; set; } // The Unique Url that this Comment will Show Up
    public bool IsDeleted { get; set; }
}

public class Comment : CommentBase
{
    public List<Reply>? Replies { get; set; }
}

public class Reply : CommentBase
{
    
}