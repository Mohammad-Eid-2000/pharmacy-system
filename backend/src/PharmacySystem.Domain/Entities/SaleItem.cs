namespace PharmacySystem.Domain.Entities;

/// <summary>
/// One invoice line: a quantity taken from one specific batch.
/// </summary>
/// <remarks>
/// A single item the customer asked for can produce several lines. Stock is
/// dispensed first-expired-first-out, so a request for 100 units may be filled
/// from three batches, and each batch gets its own line — that is what makes the
/// sale traceable to the physical stock actually handed over.
///
/// The medicine name, batch number and price are copied onto the line rather
/// than read through the foreign keys. An invoice is a legal document: reprinting
/// it a year later must show the name and price as they were at the moment of
/// sale, not as they are now after a rename or a price change.
/// </remarks>
public class SaleItem
{
    public int Id { get; set; }

    public int SaleId { get; set; }

    public int MedicineId { get; set; }

    public int BatchId { get; set; }

    // ── Snapshots taken at the time of sale ──────────────────────────────────

    public string MedicineNameAr { get; set; } = string.Empty;

    public string MedicineNameEn { get; set; } = string.Empty;

    public string BatchNo { get; set; } = string.Empty;

    public DateTime ExpiryDate { get; set; }

    /// <summary>Net unit price charged, excluding tax.</summary>
    public decimal UnitPrice { get; set; }

    /// <summary>Tax percentage applied to this line, as a whole number (e.g. 16).</summary>
    public int TaxRate { get; set; }

    // ── Amounts ──────────────────────────────────────────────────────────────

    public int Quantity { get; set; }

    /// <summary>Quantity × UnitPrice.</summary>
    public decimal LineSubtotal { get; set; }

    /// <summary>LineSubtotal × TaxRate%.</summary>
    public decimal LineTax { get; set; }

    /// <summary>LineSubtotal + LineTax.</summary>
    public decimal LineTotal { get; set; }

    public virtual Sale Sale { get; set; } = null!;
    public virtual Medicine Medicine { get; set; } = null!;
    public virtual Batch Batch { get; set; } = null!;
}
