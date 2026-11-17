using evanbecker_domain;
using Microsoft.EntityFrameworkCore;

namespace evanbecker_api.Tests;

public class ModelSnapshotTests
{
    /// <summary>
    /// The entities and the migrations agree, so the next migration anyone adds holds only what they meant. Taking the
    /// comment entities out of the model without a migration fails this; the migration that would fix it drops the
    /// Comments and Replies tables and their rows, so it waits for Evan.
    /// </summary>
    [Fact]
    public void The_model_matches_the_last_migration()
    {
        var options = new DbContextOptionsBuilder<ApplicationContext>().UseNpgsql("Host=unused").Options;
        using var db = new ApplicationContext(options);

        Assert.False(db.Database.HasPendingModelChanges(), "The model has changes no migration records.");
    }
}
