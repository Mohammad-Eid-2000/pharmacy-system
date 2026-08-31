namespace PharmacySystem.Domain.Enums;

/// <summary>
/// How a sale was settled. Persisted as a string so end-of-day cash
/// reconciliation reports stay readable straight from the database.
/// </summary>
public enum PaymentMethod
{
    Cash = 1,

    /// <summary>Debit or credit card via the pharmacy's POS terminal.</summary>
    Card = 2,

    /// <summary>Covered by a health insurer; settled later against the insurer.</summary>
    Insurance = 3,

    /// <summary>Mobile wallet transfer (eFAWATEERcom, CliQ and similar).</summary>
    MobileWallet = 4,
}
