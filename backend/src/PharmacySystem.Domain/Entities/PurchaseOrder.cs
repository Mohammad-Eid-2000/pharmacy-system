using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Domain.Entities;

/// <summary>
/// A purchase order (طلب شراء) placed with a supplier. The header holds the
/// agreed amounts; each line names a medicine, the ordered quantity and the agreed
/// unit price. Totals are computed server-side from stored tax rates, not trusted
/// from the client.
/// </summary>
/// <remarks>
/// Orders follow the same audit discipline as sales: an order is never edited
/// after it has been confirmed or partially received, and never deleted. A mistaken
/// draft is edited; a mistaken confirmed order is cancelled, preserving the
/// original figures for supplier reconciliation.
/// </remarks>
public class PurchaseOrder
{
    public int Id { get; set; }

    /// <summary>Human-readable sequential order number, e.g. PO-20260908-0003.</summary>
    public string OrderNo { get; set; } = string.Empty;

    public int SupplierId { get; set; }

    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    /// <summary>When the delivery is expected; guidance for the receiving screen.</summary>
    public DateTime? ExpectedDeliveryDate { get; set; }

    public PurchaseStatus Status { get; set; } = PurchaseStatus.Draft;

    /// <summary>Sum of the line net amounts, before tax and before any discount.</summary>
    public decimal Subtotal { get; set; }

    /// <summary>Sum of the per-line input VAT on the purchase.</summary>
    public decimal TaxAmount { get; set; }

    /// <summary>Flat order-level discount negotiated with the supplier.</summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>What the pharmacy actually pays: Subtotal + Tax - Discount.</summary>
    public decimal TotalAmount { get; set; }

    public string? Notes { get; set; }

    /// <summary>Who raised the order. Populated once authentication is added.</summary>
    public string? CreatedBy { get; set; }

    public DateTime? ReceivedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CancelReason { get; set; }

    public virtual Supplier Supplier { get; set; } = null!;

    public virtual ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}