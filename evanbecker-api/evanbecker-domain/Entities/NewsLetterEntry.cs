using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace evanbecker_domain.Entities;

public class NewsLetterEntry
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid? Id { get; set; }
    
    [MaxLength(255)]
    public required string EmailAddress { get; set; }

    public DateTime Created { get; set; }
}