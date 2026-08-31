using MediatR;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Inventory;

/// <summary>How urgently a medicine needs restocking.</summary>
public enum StockStatus
{
    OutOfStock,
    Low,
    Ok,
}

/// <summary>How close a batch is to expiry.</summary>
public enum ExpiryStatus
{
    Expired,
    ExpiringSoon,
    Valid,
}

/// <summary>Aggregated stock position for one medicine across all its batches.</summary>
public record InventoryItemDto(
    int MedicineId,
    string NameAr,
    string NameEn,
    string Barcode,
    string Form,
    string? Strength,
    bool IsControlled,
    int ReorderLevel,
    int TotalQuantity,
    int BatchCount,
    DateTime? NearestExpiryDate,
    int ExpiredBatchCount,
    int ExpiringSoonBatchCount,
    decimal StockValue,
    StockStatus StockStatus
);

/// <summary>A single physical batch of a medicine.</summary>
public record BatchDto(
    int Id,
    int MedicineId,
    string MedicineNameAr,
    string MedicineNameEn,
    string Barcode,
    string BatchNo,
    DateTime ExpiryDate,
    int Quantity,
    int InitialQuantity,
    decimal PurchasePrice,
    decimal SellingPrice,
    string? SupplierName,
    DateTime ReceivedDate,
    bool IsActive,
    int DaysUntilExpiry,
    ExpiryStatus ExpiryStatus
);

public record StockMovementDto(
    int Id,
    int BatchId,
    string BatchNo,
    int MedicineId,
    string MedicineNameAr,
    string MedicineNameEn,
    StockMovementType MovementType,
    int QuantityChange,
    int QuantityBefore,
    int QuantityAfter,
    string? Reason,
    string? Reference,
    string? PerformedBy,
    DateTime CreatedAt
);

/// <summary>Headline figures for the inventory dashboard.</summary>
public record InventorySummaryDto(
    int TotalMedicines,
    int TotalBatches,
    int TotalUnits,
    decimal TotalStockValue,
    int OutOfStockCount,
    int LowStockCount,
    int ExpiredBatchCount,
    int ExpiringSoonBatchCount,
    decimal ExpiredStockValue
);

// ── Queries ─────────────────────────────────────────────────────────────────

public record GetInventoryQuery(
    string? SearchTerm = null,
    StockStatus? Status = null,
    bool? IsControlled = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<InventoryItemDto>>;

public record GetBatchesQuery(
    int? MedicineId = null,
    string? SearchTerm = null,
    ExpiryStatus? ExpiryStatus = null,
    bool IncludeDepleted = true,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<BatchDto>>;

public record GetStockMovementsQuery(
    int? BatchId = null,
    int? MedicineId = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<PagedResult<StockMovementDto>>;

public record GetInventorySummaryQuery : IRequest<InventorySummaryDto>;

// ── Commands ────────────────────────────────────────────────────────────────

/// <summary>Records a goods receipt, creating a new batch and its opening movement.</summary>
public record ReceiveStockCommand(
    int MedicineId,
    string BatchNo,
    DateTime ExpiryDate,
    int Quantity,
    decimal PurchasePrice,
    decimal SellingPrice,
    string? SupplierName = null,
    string? Reference = null
) : IRequest<int>;

/// <summary>
/// Corrects a batch quantity to a counted value, recording the delta as an
/// auditable movement. Used for stock counts, disposals and returns.
/// </summary>
public record AdjustStockCommand(
    int BatchId,
    int NewQuantity,
    StockMovementType MovementType,
    string Reason,
    string? Reference = null
) : IRequest<Unit>;
