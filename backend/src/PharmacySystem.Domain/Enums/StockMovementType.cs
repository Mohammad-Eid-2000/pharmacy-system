namespace PharmacySystem.Domain.Enums;

/// <summary>
/// Why a batch quantity changed. Persisted as a string so the audit trail
/// stays readable directly in the database — important for JFDA inspections
/// of controlled substances.
/// </summary>
public enum StockMovementType
{
    /// <summary>Goods received from a supplier (new batch).</summary>
    Receipt = 1,

    /// <summary>Sold or dispensed to a patient.</summary>
    Dispense = 2,

    /// <summary>Manual correction after a physical stock count.</summary>
    Adjustment = 3,

    /// <summary>Destroyed because it expired or was damaged.</summary>
    Disposal = 4,

    /// <summary>Sent back to the supplier.</summary>
    ReturnToSupplier = 5,

    /// <summary>Returned by a customer back into stock.</summary>
    CustomerReturn = 6,
}
