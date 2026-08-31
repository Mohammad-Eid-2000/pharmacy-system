using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;
using PharmacySystem.Domain.Entities;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Infrastructure.Data;

public class AppDbContext : DbContext, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<Pharmacy> Pharmacies => Set<Pharmacy>();
    public DbSet<PharmacyBranch> PharmacyBranches => Set<PharmacyBranch>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();

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
            // Jordanian Dinar uses 3 decimal places (fils)
            entity.Property(e => e.PurchasePrice).HasPrecision(18, 3);
            entity.Property(e => e.SellingPrice).HasPrecision(18, 3);
            entity.HasOne(e => e.Medicine)
                  .WithMany(m => m.Batches)
                  .HasForeignKey(e => e.MedicineId);
            entity.HasIndex(e => e.ExpiryDate);
            // A batch number is unique per medicine, not globally: two different
            // products may legitimately share a supplier's batch numbering.
            entity.HasIndex(e => new { e.MedicineId, e.BatchNo }).IsUnique();
            entity.Property(e => e.SupplierName).HasMaxLength(200);
        });

        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Stored as text so the audit trail is readable without decoding ints.
            entity.Property(e => e.MovementType)
                  .HasConversion<string>()
                  .HasMaxLength(30)
                  .IsRequired();
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.Reference).HasMaxLength(100);
            entity.Property(e => e.PerformedBy).HasMaxLength(100);
            entity.HasOne(e => e.Batch)
                  .WithMany(b => b.Movements)
                  .HasForeignKey(e => e.BatchId)
                  // Deleting a batch must not silently erase its audit history.
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.BatchId);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<Sale>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InvoiceNo).IsRequired().HasMaxLength(30);
            // The till derives the next number from the numbers already stored;
            // this index is the backstop that stops two tills persisting the same one.
            entity.HasIndex(e => e.InvoiceNo).IsUnique();
            entity.Property(e => e.Subtotal).HasPrecision(18, 3);
            entity.Property(e => e.TaxAmount).HasPrecision(18, 3);
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 3);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 3);
            entity.Property(e => e.AmountPaid).HasPrecision(18, 3);
            entity.Property(e => e.ChangeDue).HasPrecision(18, 3);
            // Stored as text so cash-up and tax reports read without decoding ints.
            entity.Property(e => e.PaymentMethod)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
            entity.Property(e => e.Status)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
            entity.Property(e => e.CustomerName).HasMaxLength(200);
            entity.Property(e => e.PrescriptionNo).HasMaxLength(50);
            entity.Property(e => e.CashierName).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.ReturnReason).HasMaxLength(500);
            // Daily takings and the sales list both filter on the date.
            entity.HasIndex(e => e.SaleDate);
            entity.HasIndex(e => e.PrescriptionNo);
        });

        modelBuilder.Entity<SaleItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MedicineNameAr).IsRequired().HasMaxLength(200);
            entity.Property(e => e.MedicineNameEn).IsRequired().HasMaxLength(200);
            entity.Property(e => e.BatchNo).IsRequired().HasMaxLength(50);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 3);
            entity.Property(e => e.LineSubtotal).HasPrecision(18, 3);
            entity.Property(e => e.LineTax).HasPrecision(18, 3);
            entity.Property(e => e.LineTotal).HasPrecision(18, 3);
            // Lines belong to the invoice and are meaningless without it.
            entity.HasOne(e => e.Sale)
                  .WithMany(s => s.Items)
                  .HasForeignKey(e => e.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);
            // Medicines and batches, by contrast, must not be removable while an
            // invoice still refers to them — that would break the audit trail.
            entity.HasOne(e => e.Medicine)
                  .WithMany()
                  .HasForeignKey(e => e.MedicineId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Batch)
                  .WithMany()
                  .HasForeignKey(e => e.BatchId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.SaleId);
            entity.HasIndex(e => e.MedicineId);
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
