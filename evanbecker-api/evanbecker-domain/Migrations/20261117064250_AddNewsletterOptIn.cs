using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace evanbeckerdomain.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsletterOptIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NewsletterOptIn",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Auth0 names an account by its email when the sign-up gave no name, and the client stored
            // that as the first name, which the account page prefilled and comments showed. An email is
            // never a first name (UserService.FirstNameOrNull): clear those, and the user fills it in.
            migrationBuilder.Sql("UPDATE \"Users\" SET \"FirstName\" = NULL WHERE \"FirstName\" LIKE '%@%';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The cleared first names aren't restored: each was the row's email, which is still there.
            migrationBuilder.DropColumn(
                name: "NewsletterOptIn",
                table: "Users");
        }
    }
}
