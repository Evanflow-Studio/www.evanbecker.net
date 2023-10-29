using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace evanbeckerdomain.Migrations
{
    /// <inheritdoc />
    public partial class CreateProjects3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Commit_Users_UserId",
                table: "Commit");

            migrationBuilder.DropForeignKey(
                name: "FK_Deployment_Users_UserId",
                table: "Deployment");

            migrationBuilder.DropIndex(
                name: "IX_Deployment_UserId",
                table: "Deployment");

            migrationBuilder.DropIndex(
                name: "IX_Commit_UserId",
                table: "Commit");

            migrationBuilder.DropColumn(
                name: "Success",
                table: "Deployment");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Deployment");

            migrationBuilder.DropColumn(
                name: "Branch",
                table: "Commit");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Commit");

            migrationBuilder.AddColumn<string>(
                name: "Conclusion",
                table: "Deployment",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAvatar",
                table: "Deployment",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserLogin",
                table: "Deployment",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserUrl",
                table: "Deployment",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Message",
                table: "Commit",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserAvatar",
                table: "Commit",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserLogin",
                table: "Commit",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserUrl",
                table: "Commit",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Conclusion",
                table: "Deployment");

            migrationBuilder.DropColumn(
                name: "UserAvatar",
                table: "Deployment");

            migrationBuilder.DropColumn(
                name: "UserLogin",
                table: "Deployment");

            migrationBuilder.DropColumn(
                name: "UserUrl",
                table: "Deployment");

            migrationBuilder.DropColumn(
                name: "Message",
                table: "Commit");

            migrationBuilder.DropColumn(
                name: "UserAvatar",
                table: "Commit");

            migrationBuilder.DropColumn(
                name: "UserLogin",
                table: "Commit");

            migrationBuilder.DropColumn(
                name: "UserUrl",
                table: "Commit");

            migrationBuilder.AddColumn<bool>(
                name: "Success",
                table: "Deployment",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Deployment",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Branch",
                table: "Commit",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Commit",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Deployment_UserId",
                table: "Deployment",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Commit_UserId",
                table: "Commit",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Commit_Users_UserId",
                table: "Commit",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Deployment_Users_UserId",
                table: "Deployment",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
