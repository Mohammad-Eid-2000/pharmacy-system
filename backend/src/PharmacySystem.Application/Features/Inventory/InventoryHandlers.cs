using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Entities;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Inventory;

/// <summary>Shared inventory rules so the thresholds live in exactly one place.</summary>
public static class InventoryPolicy
{
    /// <summary>
    /// A batch within this many days of expiry is flagged for action. Jordanian
    /// suppliers typically accept returns up to 3 months before expiry.
    /// </summary>
    public const int ExpiringSoonDays = 90;

    public static ExpiryStatus GetExpiryStatus(DateTime expiryDate, DateTime today)
    {
        var expiry = expiryDate.Date;
        if (expiry < today) return ExpiryStatus.Expired;
        if (expiry <= today.AddDays(ExpiringSoonDays)) return ExpiryStatus.ExpiringSoon;
        return ExpiryStatus.Valid;
    }

    public static StockStatus GetStockStatus(int totalQuantity, int reorderLevel)
    {
        if (totalQuantity <= 0) return StockStatus.OutOfStock;
        return totalQuantity <= reorderLevel ? StockStatus.Low : StockStatus.Ok;
    }
}

// ── Queries ─────────────────────────────────────────────────────────────────

/// <summary>
/// Aggregates every medicine's batches into a single stock position. Starts from
/// Medicines rather than Batches so products with no stock at all still surface
/// as out-of-stock instead of silently disappearing.
/// </summary>
public class GetInventoryHandler : IRequestHandler<GetInventoryQuery, PagedResult<InventoryItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<InventoryItemDto>> Handle(GetInventoryQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var today = DateTime.UtcNow.Date;
        var soonCutoff = today.AddDays(InventoryPolicy.ExpiringSoonDays);

        var medicines = _context.Medicines.Where(m => m.IsActive);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            medicines = medicines.Where(m => m.NameAr.Contains(term) ||
                                             m.NameEn.Contains(term) ||
                                             m.Barcode.Contains(term));
        }

        if (request.IsControlled.HasValue)
        {
            medicines = medicines.Where(m => m.IsControlled == request.IsControlled.Value);
        }

        // Aggregate in the database. Nullable sums guard against SUM() over zero
        // rows returning NULL, which would otherwise fail to materialize.
        var aggregated = medicines.Select(m => new
        {
            m.Id,
            m.NameAr,
            m.NameEn,
            m.Barcode,
            m.Form,
            m.Strength,
            m.IsControlled,
            m.ReorderLevel,
            TotalQuantity = m.Batches.Where(b => b.IsActive).Sum(b => (int?)b.Quantity) ?? 0,
            BatchCount = m.Batches.Count(b => b.IsActive && b.Quantity > 0),
            NearestExpiryDate = m.Batches
                .Where(b => b.IsActive && b.Quantity > 0)
                .Min(b => (DateTime?)b.ExpiryDate),
            ExpiredBatchCount = m.Batches.Count(b => b.IsActive && b.Quantity > 0 && b.ExpiryDate < today),
            ExpiringSoonBatchCount = m.Batches.Count(b =>
                b.IsActive && b.Quantity > 0 && b.ExpiryDate >= today && b.ExpiryDate <= soonCutoff),
            StockValue = m.Batches
                .Where(b => b.IsActive)
                .Sum(b => (decimal?)(b.Quantity * b.PurchasePrice)) ?? 0m,
        });

        // Status filtering happens on the aggregate, so it must run in SQL before paging.
        aggregated = request.Status switch
        {
            StockStatus.OutOfStock => aggregated.Where(x => x.TotalQuantity <= 0),
            StockStatus.Low => aggregated.Where(x => x.TotalQuantity > 0 && x.TotalQuantity <= x.ReorderLevel),
            StockStatus.Ok => aggregated.Where(x => x.TotalQuantity > x.ReorderLevel),
            _ => aggregated,
        };

        var totalCount = await aggregated.CountAsync(cancellationToken);

        var rows = await aggregated
            // Most urgent first: empty stock, then nearest expiry.
            .OrderBy(x => x.TotalQuantity)
            .ThenBy(x => x.NearestExpiryDate ?? DateTime.MaxValue)
            .ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new InventoryItemDto(
            x.Id, x.NameAr, x.NameEn, x.Barcode, x.Form, x.Strength, x.IsControlled,
            x.ReorderLevel, x.TotalQuantity, x.BatchCount, x.NearestExpiryDate,
            x.ExpiredBatchCount, x.ExpiringSoonBatchCount, x.StockValue,
            InventoryPolicy.GetStockStatus(x.TotalQuantity, x.ReorderLevel)
        )).ToList();

        return new PagedResult<InventoryItemDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

public class GetBatchesHandler : IRequestHandler<GetBatchesQuery, PagedResult<BatchDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBatchesHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<BatchDto>> Handle(GetBatchesQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var today = DateTime.UtcNow.Date;
        var soonCutoff = today.AddDays(InventoryPolicy.ExpiringSoonDays);

        var query = _context.Batches.Where(b => b.IsActive);

        if (request.MedicineId.HasValue)
        {
            query = query.Where(b => b.MedicineId == request.MedicineId.Value);
        }

        if (!request.IncludeDepleted)
        {
            query = query.Where(b => b.Quantity > 0);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(b => b.BatchNo.Contains(term) ||
                                     b.Medicine.NameAr.Contains(term) ||
                                     b.Medicine.NameEn.Contains(term) ||
                                     b.Medicine.Barcode.Contains(term));
        }

        query = request.ExpiryStatus switch
        {
            Inventory.ExpiryStatus.Expired => query.Where(b => b.ExpiryDate < today),
            Inventory.ExpiryStatus.ExpiringSoon => query.Where(b => b.ExpiryDate >= today && b.ExpiryDate <= soonCutoff),
            Inventory.ExpiryStatus.Valid => query.Where(b => b.ExpiryDate > soonCutoff),
            _ => query,
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var rows = await query
            // First-Expired-First-Out: the batch to act on comes first.
            .OrderBy(b => b.ExpiryDate)
            .ThenBy(b => b.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id,
                b.MedicineId,
                b.Medicine.NameAr,
                b.Medicine.NameEn,
                b.Medicine.Barcode,
                b.BatchNo,
                b.ExpiryDate,
                b.Quantity,
                b.InitialQuantity,
                b.PurchasePrice,
                b.SellingPrice,
                b.SupplierName,
                b.ReceivedDate,
                b.IsActive,
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(b => new BatchDto(
            b.Id, b.MedicineId, b.NameAr, b.NameEn, b.Barcode, b.BatchNo,
            b.ExpiryDate, b.Quantity, b.InitialQuantity, b.PurchasePrice, b.SellingPrice,
            b.SupplierName, b.ReceivedDate, b.IsActive,
            (int)(b.ExpiryDate.Date - today).TotalDays,
            InventoryPolicy.GetExpiryStatus(b.ExpiryDate, today)
        )).ToList();

        return new PagedResult<BatchDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

public class GetStockMovementsHandler : IRequestHandler<GetStockMovementsQuery, PagedResult<StockMovementDto>>
{
    private readonly IApplicationDbContext _context;

    public GetStockMovementsHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<StockMovementDto>> Handle(GetStockMovementsQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = _context.StockMovements.AsQueryable();

        if (request.BatchId.HasValue)
        {
            query = query.Where(sm => sm.BatchId == request.BatchId.Value);
        }

        if (request.MedicineId.HasValue)
        {
            query = query.Where(sm => sm.Batch.MedicineId == request.MedicineId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(sm => sm.CreatedAt)
            .ThenByDescending(sm => sm.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(sm => new StockMovementDto(
                sm.Id,
                sm.BatchId,
                sm.Batch.BatchNo,
                sm.Batch.MedicineId,
                sm.Batch.Medicine.NameAr,
                sm.Batch.Medicine.NameEn,
                sm.MovementType,
                sm.QuantityChange,
                sm.QuantityBefore,
                sm.QuantityAfter,
                sm.Reason,
                sm.Reference,
                sm.PerformedBy,
                sm.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<StockMovementDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

public class GetInventorySummaryHandler : IRequestHandler<GetInventorySummaryQuery, InventorySummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetInventorySummaryHandler(IApplicationDbContext context) => _context = context;

    public async Task<InventorySummaryDto> Handle(GetInventorySummaryQuery request, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        var soonCutoff = today.AddDays(InventoryPolicy.ExpiringSoonDays);

        // One round trip for the per-medicine stock levels, which the
        // out-of-stock and low-stock counts both derive from.
        var stockLevels = await _context.Medicines
            .Where(m => m.IsActive)
            .Select(m => new
            {
                m.ReorderLevel,
                TotalQuantity = m.Batches.Where(b => b.IsActive).Sum(b => (int?)b.Quantity) ?? 0,
            })
            .ToListAsync(cancellationToken);

        var activeBatches = _context.Batches.Where(b => b.IsActive && b.Quantity > 0);

        var batchStats = await activeBatches
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalBatches = g.Count(),
                TotalUnits = g.Sum(b => (int?)b.Quantity) ?? 0,
                TotalStockValue = g.Sum(b => (decimal?)(b.Quantity * b.PurchasePrice)) ?? 0m,
                ExpiredBatchCount = g.Count(b => b.ExpiryDate < today),
                ExpiringSoonBatchCount = g.Count(b => b.ExpiryDate >= today && b.ExpiryDate <= soonCutoff),
                ExpiredStockValue = g
                    .Where(b => b.ExpiryDate < today)
                    .Sum(b => (decimal?)(b.Quantity * b.PurchasePrice)) ?? 0m,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new InventorySummaryDto(
            TotalMedicines: stockLevels.Count,
            TotalBatches: batchStats?.TotalBatches ?? 0,
            TotalUnits: batchStats?.TotalUnits ?? 0,
            TotalStockValue: batchStats?.TotalStockValue ?? 0m,
            OutOfStockCount: stockLevels.Count(x => x.TotalQuantity <= 0),
            LowStockCount: stockLevels.Count(x => x.TotalQuantity > 0 && x.TotalQuantity <= x.ReorderLevel),
            ExpiredBatchCount: batchStats?.ExpiredBatchCount ?? 0,
            ExpiringSoonBatchCount: batchStats?.ExpiringSoonBatchCount ?? 0,
            ExpiredStockValue: batchStats?.ExpiredStockValue ?? 0m);
    }
}

// ── Commands ────────────────────────────────────────────────────────────────

public class ReceiveStockHandler : IRequestHandler<ReceiveStockCommand, int>
{
    private readonly IApplicationDbContext _context;

    public ReceiveStockHandler(IApplicationDbContext context) => _context = context;

    public async Task<int> Handle(ReceiveStockCommand request, CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
            throw new ValidationException("Received quantity must be greater than zero.");

        if (request.PurchasePrice < 0 || request.SellingPrice < 0)
            throw new ValidationException("Prices cannot be negative.");

        if (string.IsNullOrWhiteSpace(request.BatchNo))
            throw new ValidationException("Batch number is required.");

        // Accepting already-expired stock into inventory is a real-world
        // data-entry error worth blocking at the boundary.
        if (request.ExpiryDate.Date <= DateTime.UtcNow.Date)
            throw new ValidationException("Expiry date must be in the future.");

        var medicine = await _context.Medicines
            .FirstOrDefaultAsync(m => m.Id == request.MedicineId, cancellationToken);
        if (medicine is null)
            throw new NotFoundException(nameof(Medicine), request.MedicineId);

        if (!medicine.IsActive)
            throw new ValidationException($"Medicine '{medicine.NameEn}' is inactive and cannot receive stock.");

        var batchNo = request.BatchNo.Trim();
        var duplicate = await _context.Batches.AnyAsync(
            b => b.MedicineId == request.MedicineId && b.BatchNo == batchNo, cancellationToken);
        if (duplicate)
            throw new ConflictException($"Batch '{batchNo}' already exists for this medicine.");

        var batch = new Batch
        {
            MedicineId = request.MedicineId,
            BatchNo = batchNo,
            ExpiryDate = request.ExpiryDate.Date,
            Quantity = request.Quantity,
            InitialQuantity = request.Quantity,
            PurchasePrice = request.PurchasePrice,
            SellingPrice = request.SellingPrice,
            SupplierName = string.IsNullOrWhiteSpace(request.SupplierName) ? null : request.SupplierName.Trim(),
            ReceivedDate = DateTime.UtcNow,
            IsActive = true,
        };

        _context.Batches.Add(batch);

        // Opening movement, so the audit trail starts from the receipt itself.
        _context.StockMovements.Add(new StockMovement
        {
            Batch = batch,
            MovementType = StockMovementType.Receipt,
            QuantityChange = request.Quantity,
            QuantityBefore = 0,
            QuantityAfter = request.Quantity,
            Reason = "Goods receipt",
            Reference = request.Reference,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync(cancellationToken);
        return batch.Id;
    }
}

public class AdjustStockHandler : IRequestHandler<AdjustStockCommand, Unit>
{
    private readonly IApplicationDbContext _context;

    public AdjustStockHandler(IApplicationDbContext context) => _context = context;

    public async Task<Unit> Handle(AdjustStockCommand request, CancellationToken cancellationToken)
    {
        if (request.NewQuantity < 0)
            throw new ValidationException("Quantity cannot be negative.");

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationException("A reason is required for a stock adjustment.");

        // Receipts create batches; they must not be replayed as adjustments,
        // otherwise the audit trail would show stock appearing from nowhere.
        if (request.MovementType == StockMovementType.Receipt)
            throw new ValidationException("Use the receive-stock endpoint to add a new batch.");

        var batch = await _context.Batches
            .FirstOrDefaultAsync(b => b.Id == request.BatchId, cancellationToken);
        if (batch is null)
            throw new NotFoundException(nameof(Batch), request.BatchId);

        if (request.NewQuantity > batch.InitialQuantity)
            throw new ValidationException(
                $"Quantity cannot exceed the batch's received quantity ({batch.InitialQuantity}).");

        var before = batch.Quantity;
        var change = request.NewQuantity - before;

        if (change == 0)
            throw new ValidationException("The new quantity is the same as the current quantity.");

        batch.Quantity = request.NewQuantity;

        _context.StockMovements.Add(new StockMovement
        {
            BatchId = batch.Id,
            MovementType = request.MovementType,
            QuantityChange = change,
            QuantityBefore = before,
            QuantityAfter = request.NewQuantity,
            Reason = request.Reason.Trim(),
            Reference = request.Reference,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
