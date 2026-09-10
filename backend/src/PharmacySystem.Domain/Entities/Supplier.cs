namespace PharmacySystem.Domain.Entities;

/// <summary>
/// A company that supplies medicines to the pharmacy. Suppliers are master data
/// shared by batches, purchase orders and the buying screen.
/// </summary>
public class Supplier
{
    public int Id { get; set; }

    /// <summary>Primary identifier shown to staff; unique across suppliers.</summary>
    public string NameAr { get; set; } = string.Empty;

    public string NameEn { get; set; } = string.Empty;

    /// <summary>Jordanian tax registration number, unique when present.</summary>
    public string? TaxId { get; set; }

    public string? Phone { get; set; }

    public string? Mobile { get; set; }

    public string? Email { get; set; }

    public string? Address { get; set; }

    public string? City { get; set; }

    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}