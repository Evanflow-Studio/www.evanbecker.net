using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_domain.Entities;

[Index(nameof(EmailAddress), IsUnique = true)]
public class NewsLetterEntry
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid? Id { get; set; }

    [MaxLength(255)]
    public required string EmailAddress { get; set; }

    public DateTime Created { get; set; }
}