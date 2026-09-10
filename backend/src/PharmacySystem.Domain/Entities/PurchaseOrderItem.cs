namespace PharmacySystem.Domain.Entities;

/// <summary>
/// One purchase-order line: a medicine, the quantity ordered and the agreed unit
/// price, plus how much of it has been received so far.
/// </summary>
/// <remarks>
/// The medicine name, barcode and tax rate are copied onto the line rather than
/// read through the foreign key. An order is a commercial document: reprinting it
/// later must show the product and pricing as they were agreed, not as they are
/// now after a rename or a tax change.
/// </remarks>
public class PurchaseOrderItem
{
    public int Id { get; set; }

    public int PurchaseOrderId { get; set; }

    public int MedicineId { get; set; }

    // ── Snapshots taken when the order was created ──────────────────────────

    public string MedicineNameAr { get; set; } = string.Empty;

    public string MedicineNameEn { get; set; } = string.Empty;

    public string Barcode { get; set; } = string.Empty;

    /// <summary>Input VAT percentage applied to this line, as a whole number (e.g. 16).</summary>
    public int TaxRate { get; set; } = 16;

    // ── Quantities ──────────────────────────────────────────────────────────

    public int QuantityOrdered { get; set; }

    /// <summary>How many units have arrived so far; never exceeds QuantityOrdered.</summary>
    public int QuantityReceived { get; set; }

    /// <summary>Net unit price agreed with the supplier, excluding tax.</summary>
    public decimal UnitPrice { get; set; }

    // ── Amounts ─────────────────────────────────────────────────────────────

    /// <summary>QuantityOrdered × UnitPrice.</summary>
    public decimal LineSubtotal { get; set; }

    /// <summary>LineSubtotal × TaxRate%.</summary>
    public decimal LineTax { get; set; }

    /// <summary>LineSubtotal + LineTax.</summary>
    public decimal LineTotal { get; set; }

    public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;
    public virtual Medicine Medicine { get; set; } = null!;
}