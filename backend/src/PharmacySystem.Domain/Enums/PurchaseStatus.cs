namespace PharmacySystem.Domain.Enums;

/// <summary>
/// Lifecycle of a purchase order. An order is never deleted: correcting a
/// mistake is done by editing a draft or cancelling a confirmed order, so the
/// paper trail with the supplier stays intact.
/// </summary>
public enum PurchaseStatus
{
    /// <summary>Being assembled; nothing has been sent to the supplier yet.</summary>
    Draft = 1,

    /// <summary>Confirmed with the supplier; stock is awaited (possibly partly received).</summary>
    Ordered = 2,

    /// <summary>Every line has been received into stock.</summary>
    Received = 3,

    /// <summary>The order was cancelled before (or instead of) delivery.</summary>
    Cancelled = 4,
}