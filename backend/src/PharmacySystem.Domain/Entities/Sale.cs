using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Domain.Entities;

/// <summary>
/// A completed counter sale — the invoice header. Financial records are never
/// edited or deleted: a mistake is corrected by returning the sale, which
/// preserves the original figures for tax and JFDA inspection.
/// </summary>
public class Sale
{
    public int Id { get; set; }

    /// <summary>Human-readable sequential invoice number, e.g. INV-20260831-0007.</summary>
    public string InvoiceNo { get; set; } = string.Empty;

    public DateTime SaleDate { get; set; } = DateTime.UtcNow;

    /// <summary>Sum of the line net amounts, before tax and before any discount.</summary>
    public decimal Subtotal { get; set; }

    /// <summary>Sum of the per-line sales tax.</summary>
    public decimal TaxAmount { get; set; }

    /// <summary>Flat invoice-level discount, applied after tax.</summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>What the customer actually owes: Subtotal + Tax - Discount.</summary>
    public decimal TotalAmount { get; set; }

    public PaymentMethod PaymentMethod { get; set; }

    /// <summary>Cash tendered. For non-cash methods this equals the total.</summary>
    public decimal AmountPaid { get; set; }

    /// <summary>Change handed back. Always zero for non-cash methods.</summary>
    public decimal ChangeDue { get; set; }

    public SaleStatus Status { get; set; } = SaleStatus.Completed;

    public string? CustomerName { get; set; }

    /// <summary>
    /// Prescription reference. Mandatory when the basket contains a controlled
    /// medicine, which Jordanian regulations do not allow to be dispensed without one.
    /// </summary>
    public string? PrescriptionNo { get; set; }

    /// <summary>Who rang up the sale. Populated once authentication is added.</summary>
    public string? CashierName { get; set; }

    public string? Notes { get; set; }

    public DateTime? ReturnedAt { get; set; }

    public string? ReturnReason { get; set; }

    public virtual ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
}
