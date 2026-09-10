using MediatR;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Purchases;

/// <summary>One purchase-order line with its remaining (not yet received) quantity.</summary>
public record PurchaseOrderItemDto(
    int Id,
    int MedicineId,
    string MedicineNameAr,
    string MedicineNameEn,
    string Barcode,
    int TaxRate,
    int QuantityOrdered,
    int QuantityReceived,
    decimal UnitPrice,
    decimal LineSubtotal,
    decimal LineTax,
    decimal LineTotal
);

/// <summary>A full purchase order with its lines, for editing, receiving and reprinting.</summary>
public record PurchaseOrderDto(
    int Id,
    string OrderNo,
    int SupplierId,
    string SupplierNameAr,
    string SupplierNameEn,
    DateTime OrderDate,
    DateTime? ExpectedDeliveryDate,
    PurchaseStatus Status,
    decimal Subtotal,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? Notes,
    DateTime? ReceivedAt,
    DateTime? CancelledAt,
    string? CancelReason,
    int TotalUnits,
    IReadOnlyList<PurchaseOrderItemDto> Items
);

/// <summary>Order without its lines, for the order list.</summary>
public record PurchaseOrderListItemDto(
    int Id,
    string OrderNo,
    int SupplierId,
    string SupplierNameAr,
    string SupplierNameEn,
    DateTime OrderDate,
    PurchaseStatus Status,
    decimal TotalAmount,
    int LineCount,
    int TotalUnits,
    int UnitsReceived
);

/// <summary>Headline figures for the purchases dashboard cards.</summary>
public record PurchasesSummaryDto(
    int DraftCount,
    int OutstandingCount,
    int ReceivedCount,
    int CancelledCount,
    decimal ReceivedCost,
    int ActiveSuppliersCount
);

// ── Queries ─────────────────────────────────────────────────────────────────

public record GetPurchaseOrdersQuery(
    string? SearchTerm = null,
    int? SupplierId = null,
    PurchaseStatus? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<PurchaseOrderListItemDto>>;

public record GetPurchaseOrderByIdQuery(int Id) : IRequest<PurchaseOrderDto>;

public record GetPurchasesSummaryQuery : IRequest<PurchasesSummaryDto>;

// ── Commands ────────────────────────────────────────────────────────────────

/// <summary>
/// One order line. Quantities and the unit price agreed with the supplier are
/// client-supplied (they are a commercial agreement, not something the server
/// can guess); the money totals are nevertheless recomputed server-side from the
/// stored tax rate so a client cannot skew the invoice totals.
/// </summary>
public record PurchaseLineRequest(int MedicineId, int Quantity, decimal UnitPrice);

/// <summary>Creates a draft order. Drafts can be edited freely.</summary>
public record CreatePurchaseOrderCommand(
    int SupplierId,
    IReadOnlyList<PurchaseLineRequest> Items,
    DateTime? ExpectedDeliveryDate = null,
    decimal DiscountAmount = 0m,
    string? Notes = null
) : IRequest<PurchaseOrderDto>;

/// <summary>Replaces a draft order's lines and details.</summary>
public record UpdatePurchaseOrderCommand(
    int Id,
    int SupplierId,
    IReadOnlyList<PurchaseLineRequest> Items,
    DateTime? ExpectedDeliveryDate = null,
    decimal DiscountAmount = 0m,
    string? Notes = null
) : IRequest<PurchaseOrderDto>;

/// <summary>Confirms a draft with the supplier; the order can no longer be edited.</summary>
public record PlacePurchaseOrderCommand(int Id) : IRequest<PurchaseOrderDto>;

/// <summary>Reverses an order that was never (or only partly) delivered.</summary>
public record CancelPurchaseOrderCommand(int Id, string Reason) : IRequest<PurchaseOrderDto>;

/// <summary>
/// One line being received. The batch number and expiry date are what actually
/// arrived, so they are captured at the goods-receipt step, not at ordering time.
/// </summary>
public record ReceiveOrderLineRequest(
    int PurchaseOrderItemId,
    string BatchNo,
    DateTime ExpiryDate,
    int Quantity,
    decimal SellingPrice
);

/// <summary>
/// Receives part (or all) of an order into stock: creates one batch per line with
/// the agreed unit price and the given retail price, and records the receipt
/// movements against the order number.
/// </summary>
public record ReceivePurchaseOrderCommand(
    int Id,
    IReadOnlyList<ReceiveOrderLineRequest> Lines
) : IRequest<PurchaseOrderDto>;