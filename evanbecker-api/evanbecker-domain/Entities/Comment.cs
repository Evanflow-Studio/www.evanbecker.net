using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_domain.Entities;

/// <summary>
/// Comments were removed from the site on 2026-11-17, and nothing in the API reads or writes these any more. The
/// entities stay so the model still matches the migrations and the Comments and Replies tables keep their rows:
/// taking them out of the model needs a migration that drops both tables, which waits for Evan's yes.
/// </summary>
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
