using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_domain.Entities;

public class CommentBase
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid? Id { get; set; }

    public DateTime Published { get; set; }

    public required User Author { get; set; }

    [MaxLength(2000)]
    public required string CommentText { get; set; }

    [MaxLength(255)]
    public required string TargetLocation { get; set; }

    public bool IsDeleted { get; set; }
}

[Index(nameof(TargetLocation), nameof(IsDeleted))]
public class Comment : CommentBase
{
    public List<Reply> Replies { get; set; } = [];
}

public class Reply : CommentBase { }
