using Microsoft.EntityFrameworkCore;
using PharmacySystem.Domain.Entities;

namespace PharmacySystem.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Medicine> Medicines { get; set; }
    public DbSet<Batch> Batches { get; set; }
    public DbSet<Pharmacy> Pharmacies { get; set; }
    public DbSet<PharmacyBranch> PharmacyBranches { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NameAr).IsRequired().HasMaxLength(200);
            entity.Property(e => e.NameEn).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Barcode).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.Barcode).IsUnique();
            entity.HasIndex(e => e.JFDARegistrationNo);
        });

        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BatchNo).IsRequired().HasMaxLength(50);
            entity.HasOne(e => e.Medicine)
                  .WithMany(m => m.Batches)
                  .HasForeignKey(e => e.MedicineId);
            entity.HasIndex(e => e.ExpiryDate);
        });

        modelBuilder.Entity<Pharmacy>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NameAr).IsRequired().HasMaxLength(200);
            entity.Property(e => e.NameEn).IsRequired().HasMaxLength(200);
            entity.Property(e => e.LicenseNo).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.LicenseNo).IsUnique();
        });

        modelBuilder.Entity<PharmacyBranch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NameAr).IsRequired().HasMaxLength(200);
            entity.Property(e => e.NameEn).IsRequired().HasMaxLength(200);
            entity.Property(e => e.BranchCode).IsRequired().HasMaxLength(20);
            entity.HasOne(e => e.Pharmacy)
                  .WithMany(p => p.Branches)
                  .HasForeignKey(e => e.PharmacyId);
        });
    }
}
