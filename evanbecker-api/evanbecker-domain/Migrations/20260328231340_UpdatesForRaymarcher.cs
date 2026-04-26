using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace evanbeckerdomain.Migrations
{
    /// <inheritdoc />
    public partial class UpdatesForRaymarcher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SpotifyAccessToken",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyDisplayName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyPremium",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyRefreshToken",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyTokenExpiry",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SpotifyAccessToken",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpotifyDisplayName",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SpotifyPremium",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SpotifyRefreshToken",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SpotifyTokenExpiry",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
