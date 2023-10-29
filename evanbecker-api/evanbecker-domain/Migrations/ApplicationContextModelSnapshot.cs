﻿// <auto-generated />
using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using evanbecker_domain;

#nullable disable

namespace evanbeckerdomain.Migrations
{
    [DbContext(typeof(ApplicationContext))]
    partial class ApplicationContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "7.0.11")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("evanbecker_domain.Entities.ActivityLog", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("boolean");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.Property<string>("Text")
                        .HasColumnType("text");

                    b.Property<int>("Type")
                        .HasColumnType("integer");

                    b.Property<Guid?>("UserId")
                        .HasColumnType("uuid");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.HasIndex("UserId");

                    b.ToTable("ActivityLog");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Comment", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<Guid?>("AuthorId")
                        .HasColumnType("uuid");

                    b.Property<string>("CommentText")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("boolean");

                    b.Property<DateTime>("Published")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("TargetLocation")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("AuthorId");

                    b.ToTable("Comments");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Commit", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Message")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.Property<string>("Sha")
                        .HasColumnType("text");

                    b.Property<string>("UserAvatar")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("UserLogin")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("UserUrl")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("Commit");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.ContactMessage", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Email")
                        .HasColumnType("text");

                    b.Property<string>("FirstName")
                        .HasColumnType("text");

                    b.Property<string>("LastName")
                        .HasColumnType("text");

                    b.Property<string>("Message")
                        .HasColumnType("text");

                    b.Property<string>("PhoneNumber")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.ToTable("ContactMessages");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Deployment", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Branch")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("Conclusion")
                        .HasColumnType("text");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Duration")
                        .HasColumnType("text");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.Property<string>("Sha")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("UserAvatar")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("UserLogin")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("UserUrl")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("Deployment");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.EmailSubscriber", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("EmailAddress")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("EmailSubscriber");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Environment", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("boolean");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Updated")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("Environment");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.EnvironmentUrl", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid?>("EnvironmentId")
                        .HasColumnType("uuid");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("boolean");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Updated")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Url")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("EnvironmentUrl");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Photo", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Base64")
                        .HasColumnType("text");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("FileName")
                        .HasColumnType("text");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("boolean");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.Property<string>("Size")
                        .HasColumnType("text");

                    b.Property<DateTime>("Updated")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("Photo");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Project", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("Created")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.Property<bool>("NotifyOnComments")
                        .HasColumnType("boolean");

                    b.Property<bool>("NotifyOnMembers")
                        .HasColumnType("boolean");

                    b.Property<bool>("NotifyOnPhotos")
                        .HasColumnType("boolean");

                    b.Property<string>("NotifyRecipients")
                        .HasColumnType("text");

                    b.Property<string>("Repository")
                        .HasColumnType("text");

                    b.Property<DateTime>("Updated")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.ToTable("Projects");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Reply", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<Guid?>("AuthorId")
                        .HasColumnType("uuid");

                    b.Property<Guid?>("CommentId")
                        .HasColumnType("uuid");

                    b.Property<string>("CommentText")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("boolean");

                    b.Property<DateTime>("Published")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("TargetLocation")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("AuthorId");

                    b.HasIndex("CommentId");

                    b.ToTable("Replies");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.User", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Auth0Id")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("Avatar")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("FirstName")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<bool>("IsAdmin")
                        .HasColumnType("boolean");

                    b.Property<bool>("IsOwner")
                        .HasColumnType("boolean");

                    b.Property<string>("LastName")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<Guid?>("ProjectId")
                        .HasColumnType("uuid");

                    b.HasKey("Id");

                    b.HasIndex("ProjectId");

                    b.ToTable("Users");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.ActivityLog", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("ActivityLogs")
                        .HasForeignKey("ProjectId");

                    b.HasOne("evanbecker_domain.Entities.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId");

                    b.Navigation("User");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Comment", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.User", "Author")
                        .WithMany("CreatedComments")
                        .HasForeignKey("AuthorId");

                    b.Navigation("Author");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Commit", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("Commits")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Deployment", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("Deployments")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.EmailSubscriber", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("EmailSubscribers")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Environment", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("Environments")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.EnvironmentUrl", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("EnvironmentUrls")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Photo", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("Photos")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Reply", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.User", "Author")
                        .WithMany()
                        .HasForeignKey("AuthorId");

                    b.HasOne("evanbecker_domain.Entities.Comment", null)
                        .WithMany("Replies")
                        .HasForeignKey("CommentId");

                    b.Navigation("Author");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.User", b =>
                {
                    b.HasOne("evanbecker_domain.Entities.Project", null)
                        .WithMany("Members")
                        .HasForeignKey("ProjectId");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Comment", b =>
                {
                    b.Navigation("Replies");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.Project", b =>
                {
                    b.Navigation("ActivityLogs");

                    b.Navigation("Commits");

                    b.Navigation("Deployments");

                    b.Navigation("EmailSubscribers");

                    b.Navigation("EnvironmentUrls");

                    b.Navigation("Environments");

                    b.Navigation("Members");

                    b.Navigation("Photos");
                });

            modelBuilder.Entity("evanbecker_domain.Entities.User", b =>
                {
                    b.Navigation("CreatedComments");
                });
#pragma warning restore 612, 618
        }
    }
}
