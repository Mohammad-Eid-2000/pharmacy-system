using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Domain.Entities;

/// <summary>
/// Immutable audit record of every stock change. Rows are only ever inserted,
/// never updated or deleted, so the full history of a batch can be reconstructed.
/// </summary>
public class StockMovement
{
    public int Id { get; set; }

    public int BatchId { get; set; }

    public StockMovementType MovementType { get; set; }

    /// <summary>
    /// Signed change applied to the batch: positive for stock coming in,
    /// negative for stock going out.
    /// </summary>
    public int QuantityChange { get; set; }

    /// <summary>Batch quantity before this movement was applied.</summary>
    public int QuantityBefore { get; set; }

    /// <summary>Batch quantity after this movement was applied.</summary>
    public int QuantityAfter { get; set; }

    /// <summary>Free-text justification, required for adjustments and disposals.</summary>
    public string? Reason { get; set; }

    /// <summary>External document reference (invoice no., prescription no., disposal record).</summary>
    public string? Reference { get; set; }

    /// <summary>Who performed the movement. Populated once authentication is added.</summary>
    public string? PerformedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Batch Batch { get; set; } = null!;
}
