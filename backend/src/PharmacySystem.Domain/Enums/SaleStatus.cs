namespace PharmacySystem.Domain.Enums;

/// <summary>
/// Lifecycle of an invoice. A sale is never deleted — reversing one moves it to
/// <see cref="Returned"/> so the original figures stay auditable.
/// </summary>
public enum SaleStatus
{
    Completed = 1,

    /// <summary>Fully reversed; the sold units were put back into their batches.</summary>
    Returned = 2,
}
