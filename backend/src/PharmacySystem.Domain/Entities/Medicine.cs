namespace PharmacySystem.Domain.Entities;

public class Medicine
{
    public int Id { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string? JFDARegistrationNo { get; set; }
    public string Form { get; set; } = string.Empty;
    public string? Strength { get; set; }
    public string? Manufacturer { get; set; }
    public int TaxRate { get; set; } = 16;
    public bool IsControlled { get; set; }
    public int ControlledLevel { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Stock level at or below which the medicine is flagged for reordering.</summary>
    public int ReorderLevel { get; set; } = 10;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public virtual ICollection<Batch> Batches { get; set; } = new List<Batch>();
}
