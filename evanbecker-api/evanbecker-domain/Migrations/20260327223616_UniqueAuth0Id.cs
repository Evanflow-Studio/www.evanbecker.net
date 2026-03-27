using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace evanbeckerdomain.Migrations
{
    /// <inheritdoc />
    public partial class UniqueAuth0Id : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Users_Auth0Id",
                table: "Users",
                column: "Auth0Id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Auth0Id",
                table: "Users");
        }
    }
}
