namespace PharmacySystem.Domain.Entities;

public class Batch
{
    public int Id { get; set; }
    public int MedicineId { get; set; }
    public string BatchNo { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public int Quantity { get; set; }
    public int InitialQuantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    
    /// <summary>Supplier invoice / goods-receipt reference this batch arrived on.</summary>
    public string? SupplierName { get; set; }

    public virtual Medicine Medicine { get; set; } = null!;
    public virtual ICollection<StockMovement> Movements { get; set; } = new List<StockMovement>();
}
