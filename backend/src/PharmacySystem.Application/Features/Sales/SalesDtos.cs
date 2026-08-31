using MediatR;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Sales;

/// <summary>
/// A medicine as the till sees it: what it costs and how much can actually be
/// sold right now. Availability deliberately excludes expired batches, so this
/// number is smaller than the inventory screen's total on-hand quantity.
/// </summary>
public record SellableProductDto(
    int MedicineId,
    string NameAr,
    string NameEn,
    string Barcode,
    string Form,
    string? Strength,
    bool IsControlled,
    int ControlledLevel,
    int TaxRate,
    decimal UnitPrice,
    int AvailableQuantity,
    DateTime? NearestExpiryDate
);

public record SaleItemDto(
    int Id,
    int MedicineId,
    int BatchId,
    string MedicineNameAr,
    string MedicineNameEn,
    string BatchNo,
    DateTime ExpiryDate,
    int Quantity,
    decimal UnitPrice,
    int TaxRate,
    decimal LineSubtotal,
    decimal LineTax,
    decimal LineTotal
);

/// <summary>A full invoice with its lines — everything needed to print a receipt.</summary>
public record SaleDto(
    int Id,
    string InvoiceNo,
    DateTime SaleDate,
    decimal Subtotal,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    PaymentMethod PaymentMethod,
    decimal AmountPaid,
    decimal ChangeDue,
    SaleStatus Status,
    string? CustomerName,
    string? PrescriptionNo,
    string? CashierName,
    string? Notes,
    DateTime? ReturnedAt,
    string? ReturnReason,
    int TotalUnits,
    IReadOnlyList<SaleItemDto> Items
);

/// <summary>Invoice without its lines, for the sales list.</summary>
public record SaleListItemDto(
    int Id,
    string InvoiceNo,
    DateTime SaleDate,
    decimal TotalAmount,
    decimal DiscountAmount,
    PaymentMethod PaymentMethod,
    SaleStatus Status,
    string? CustomerName,
    string? PrescriptionNo,
    int LineCount,
    int TotalUnits
);

/// <summary>Till figures for the current day.</summary>
public record SalesSummaryDto(
    DateTime Date,
    int SalesCount,
    int ReturnedCount,
    int UnitsSold,
    decimal Revenue,
    decimal TaxCollected,
    decimal DiscountsGiven,
    decimal AverageBasket,
    decimal CashRevenue,
    decimal NonCashRevenue
);

// ── Queries ─────────────────────────────────────────────────────────────────

public record GetSellableProductsQuery(
    string? SearchTerm = null,
    bool InStockOnly = true,
    int Page = 1,
    int PageSize = 20
) : IRequest<PagedResult<SellableProductDto>>;

public record GetSalesQuery(
    string? SearchTerm = null,
    SaleStatus? Status = null,
    PaymentMethod? PaymentMethod = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<SaleListItemDto>>;

public record GetSaleByIdQuery(int Id) : IRequest<SaleDto>;

/// <summary>Totals for a single day. Defaults to today when no date is given.</summary>
public record GetSalesSummaryQuery(DateTime? Date = null) : IRequest<SalesSummaryDto>;

// ── Commands ────────────────────────────────────────────────────────────────

/// <summary>
/// One basket line. Only the medicine and how many units are requested — the
/// server picks the batches and the price.
/// </summary>
public record SaleLineRequest(int MedicineId, int Quantity);

/// <summary>
/// Rings up a sale.
/// </summary>
/// <remarks>
/// Note what the client does <em>not</em> send: no prices, no tax, no total. Those
/// are read from the database and computed server-side, because a caller that can
/// name its own prices can sell anything for nothing.
/// </remarks>
public record CreateSaleCommand(
    IReadOnlyList<SaleLineRequest> Items,
    PaymentMethod PaymentMethod,
    decimal AmountPaid,
    decimal DiscountAmount = 0m,
    string? CustomerName = null,
    string? PrescriptionNo = null,
    string? Notes = null
) : IRequest<SaleDto>;

/// <summary>
/// Reverses a whole sale, returning every dispensed unit to the batch it came from.
/// </summary>
public record ReturnSaleCommand(int SaleId, string Reason) : IRequest<SaleDto>;
