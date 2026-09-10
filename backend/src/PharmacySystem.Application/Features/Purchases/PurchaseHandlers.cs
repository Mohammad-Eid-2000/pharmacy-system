using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Entities;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Purchases;

/// <summary>Purchasing rules kept in one place so orders and the summary agree.</summary>
public static class PurchasesPolicy
{
    /// <summary>
    /// The Jordanian dinar subdivides into 1000 fils, so every monetary amount is
    /// rounded to 3 decimals — the same convention the till uses. Each line is
    /// rounded as it is computed so printed order amounts add up exactly.
    /// </summary>
    public const int MoneyDecimals = 3;

    public static decimal Round(decimal value) =>
        Math.Round(value, MoneyDecimals, MidpointRounding.AwayFromZero);

    /// <summary>Statuses that still expect goods to be delivered.</summary>
    public static bool IsOutstanding(PurchaseStatus status) =>
        status == PurchaseStatus.Draft || status == PurchaseStatus.Ordered;
}

// ── Queries ─────────────────────────────────────────────────────────────────

public class GetPurchaseOrdersHandler : IRequestHandler<GetPurchaseOrdersQuery, PagedResult<PurchaseOrderListItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPurchaseOrdersHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<PurchaseOrderListItemDto>> Handle(
        GetPurchaseOrdersQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = _context.PurchaseOrders.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(o => o.OrderNo.Contains(term) ||
                                     o.Supplier.NameAr.Contains(term) ||
                                     o.Supplier.NameEn.Contains(term));
        }

        if (request.SupplierId.HasValue)
            query = query.Where(o => o.SupplierId == request.SupplierId.Value);

        if (request.Status.HasValue)
            query = query.Where(o => o.Status == request.Status.Value);

        if (request.FromDate.HasValue)
        {
            var from = request.FromDate.Value.Date;
            query = query.Where(o => o.OrderDate >= from);
        }

        if (request.ToDate.HasValue)
        {
            // Inclusive of the whole end day, matching the sales filter.
            var toExclusive = request.ToDate.Value.Date.AddDays(1);
            query = query.Where(o => o.OrderDate < toExclusive);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(o => o.OrderDate)
            .ThenByDescending(o => o.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new PurchaseOrderListItemDto(
                o.Id,
                o.OrderNo,
                o.SupplierId,
                o.Supplier.NameAr,
                o.Supplier.NameEn,
                o.OrderDate,
                o.Status,
                o.TotalAmount,
                o.Items.Count(),
                o.Items.Sum(i => (int?)i.QuantityOrdered) ?? 0,
                o.Items.Sum(i => (int?)i.QuantityReceived) ?? 0))
            .ToListAsync(cancellationToken);

        return new PagedResult<PurchaseOrderListItemDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

public class GetPurchaseOrderByIdHandler : IRequestHandler<GetPurchaseOrderByIdQuery, PurchaseOrderDto>
{
    private readonly IApplicationDbContext _context;

    public GetPurchaseOrderByIdHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchaseOrderDto> Handle(
        GetPurchaseOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var order = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (order is null)
            throw new NotFoundException(nameof(PurchaseOrder), request.Id);

        return PurchaseMapper.ToDto(order);
    }
}

public class GetPurchasesSummaryHandler : IRequestHandler<GetPurchasesSummaryQuery, PurchasesSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetPurchasesSummaryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchasesSummaryDto> Handle(
        GetPurchasesSummaryQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var startOfYear = new DateTime(now.Year, 1, 1);
        var nextYear = new DateTime(now.Year + 1, 1, 1);

        var draftCount = await _context.PurchaseOrders
            .CountAsync(o => o.Status == PurchaseStatus.Draft, cancellationToken);
        var outstandingCount = await _context.PurchaseOrders
            .CountAsync(o => o.Status == PurchaseStatus.Ordered, cancellationToken);
        var receivedCount = await _context.PurchaseOrders
            .CountAsync(o => o.Status == PurchaseStatus.Received, cancellationToken);
        var cancelledCount = await _context.PurchaseOrders
            .CountAsync(o => o.Status == PurchaseStatus.Cancelled, cancellationToken);
        var activeSuppliersCount = await _context.Suppliers
            .CountAsync(s => s.IsActive, cancellationToken);

        // Cost of what actually arrived this calendar year — the number that says
        // how much the pharmacy committed to buying, useful against the year's sales.
        var receivedCost = (await _context.PurchaseOrders
            .Where(o => o.Status == PurchaseStatus.Received &&
                        o.ReceivedAt >= startOfYear &&
                        o.ReceivedAt < nextYear)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Sum(o => (decimal?)o.TotalAmount) ?? 0m,
            })
            .FirstOrDefaultAsync(cancellationToken))?.Total ?? 0m;

        return new PurchasesSummaryDto(
            DraftCount: draftCount,
            OutstandingCount: outstandingCount,
            ReceivedCount: receivedCount,
            CancelledCount: cancelledCount,
            ReceivedCost: receivedCost,
            ActiveSuppliersCount: activeSuppliersCount);
    }
}

// ── Commands ────────────────────────────────────────────────────────────────

public class CreatePurchaseOrderHandler : IRequestHandler<CreatePurchaseOrderCommand, PurchaseOrderDto>
{
    private readonly IApplicationDbContext _context;

    public CreatePurchaseOrderHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchaseOrderDto> Handle(
        CreatePurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var supplier = await RequireSupplierAsync(request.SupplierId, cancellationToken);

        var assembly = await PurchaseOrderAssembler.AssembleAsync(
            _context, request.Items, request.DiscountAmount, cancellationToken);

        var order = new PurchaseOrder
        {
            SupplierId = supplier.Id,
            OrderDate = DateTime.UtcNow,
            ExpectedDeliveryDate = request.ExpectedDeliveryDate,
            Status = PurchaseStatus.Draft,
            Subtotal = assembly.Subtotal,
            TaxAmount = assembly.TaxAmount,
            DiscountAmount = PurchasesPolicy.Round(request.DiscountAmount),
            TotalAmount = assembly.TotalAmount,
            Notes = Trim(request.Notes),
        };

        order.OrderNo = await NextOrderNoAsync(order.OrderDate, cancellationToken);

        foreach (var item in assembly.Items)
        {
            item.PurchaseOrder = order;
            order.Items.Add(item);
        }

        // Attached so the response maps without a second query for the name.
        order.Supplier = supplier;

        _context.PurchaseOrders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseMapper.ToDto(order);
    }

    /// <summary>
    /// Builds the next order number for the day, e.g. PO-20260908-0003. The
    /// sequence is derived from the numbers already stored, so cancelling an
    /// order never reuses a number; the unique index is the backstop against
    /// two callers racing to persist the same one.
    /// </summary>
    private async Task<string> NextOrderNoAsync(DateTime orderDate, CancellationToken cancellationToken)
    {
        var prefix = $"PO-{orderDate:yyyyMMdd}-";

        var lastNo = await _context.PurchaseOrders
            .Where(o => o.OrderNo.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNo)
            .Select(o => o.OrderNo)
            .FirstOrDefaultAsync(cancellationToken);

        var sequence = 1;
        if (lastNo is not null &&
            int.TryParse(lastNo[prefix.Length..], out var lastSequence))
        {
            sequence = lastSequence + 1;
        }

        return prefix + sequence.ToString("D4");
    }

    private async Task<Supplier> RequireSupplierAsync(int id, CancellationToken cancellationToken)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (supplier is null)
            throw new NotFoundException(nameof(Supplier), id);
        if (!supplier.IsActive)
            throw new ValidationException($"Supplier '{supplier.NameAr}' is inactive and cannot receive orders.");
        return supplier;
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public class UpdatePurchaseOrderHandler : IRequestHandler<UpdatePurchaseOrderCommand, PurchaseOrderDto>
{
    private readonly IApplicationDbContext _context;

    public UpdatePurchaseOrderHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchaseOrderDto> Handle(
        UpdatePurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.PurchaseOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (order is null)
            throw new NotFoundException(nameof(PurchaseOrder), request.Id);

        if (order.Status != PurchaseStatus.Draft)
            throw new ConflictException(
                $"Order '{order.OrderNo}' has already been placed and can no longer be edited.");

        if (order.Items.Any(i => i.QuantityReceived > 0))
            throw new ConflictException(
                $"Order '{order.OrderNo}' has received stock and can no longer be edited.");

        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == request.SupplierId, cancellationToken);
        if (supplier is null)
            throw new NotFoundException(nameof(Supplier), request.SupplierId);
        if (!supplier.IsActive)
            throw new ValidationException($"Supplier '{supplier.NameAr}' is inactive and cannot receive orders.");

        var assembly = await PurchaseOrderAssembler.AssembleAsync(
            _context, request.Items, request.DiscountAmount, cancellationToken);

        // A draft may still be reshaped freely; its number stays put.
        order.Items.Clear();
        foreach (var item in assembly.Items)
        {
            item.PurchaseOrder = order;
            order.Items.Add(item);
        }

        order.SupplierId = supplier.Id;
        order.Supplier = supplier;
        order.ExpectedDeliveryDate = request.ExpectedDeliveryDate;
        order.DiscountAmount = PurchasesPolicy.Round(request.DiscountAmount);
        order.Subtotal = assembly.Subtotal;
        order.TaxAmount = assembly.TaxAmount;
        order.TotalAmount = assembly.TotalAmount;
        order.Notes = Trim(request.Notes);

        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseMapper.ToDto(order);
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public class PlacePurchaseOrderHandler : IRequestHandler<PlacePurchaseOrderCommand, PurchaseOrderDto>
{
    private readonly IApplicationDbContext _context;

    public PlacePurchaseOrderHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchaseOrderDto> Handle(
        PlacePurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (order is null)
            throw new NotFoundException(nameof(PurchaseOrder), request.Id);

        if (order.Status != PurchaseStatus.Draft)
            throw new ConflictException(
                $"Order '{order.OrderNo}' is no longer a draft and cannot be placed.");

        if (order.Items.Count == 0)
            throw new ValidationException("An order must contain at least one line before it is placed.");

        order.Status = PurchaseStatus.Ordered;

        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseMapper.ToDto(order);
    }
}

public class CancelPurchaseOrderHandler : IRequestHandler<CancelPurchaseOrderCommand, PurchaseOrderDto>
{
    private readonly IApplicationDbContext _context;

    public CancelPurchaseOrderHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchaseOrderDto> Handle(
        CancelPurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationException("A reason is required to cancel an order.");

        var order = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (order is null)
            throw new NotFoundException(nameof(PurchaseOrder), request.Id);

        if (order.Status == PurchaseStatus.Received)
            throw new ValidationException(
                $"Order '{order.OrderNo}' has been received; return the stock instead of cancelling it.");

        if (order.Status == PurchaseStatus.Cancelled)
            throw new ConflictException($"Order '{order.OrderNo}' has already been cancelled.");

        order.Status = PurchaseStatus.Cancelled;
        order.CancelledAt = DateTime.UtcNow;
        order.CancelReason = request.Reason.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseMapper.ToDto(order);
    }
}

public class ReceivePurchaseOrderHandler : IRequestHandler<ReceivePurchaseOrderCommand, PurchaseOrderDto>
{
    private readonly IApplicationDbContext _context;

    public ReceivePurchaseOrderHandler(IApplicationDbContext context) => _context = context;

    public async Task<PurchaseOrderDto> Handle(
        ReceivePurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            throw new ValidationException("At least one line must be received.");

        if (request.Lines.Any(l => l.Quantity <= 0))
            throw new ValidationException("Every received quantity must be greater than zero.");

        if (request.Lines.Any(l => l.SellingPrice < 0))
            throw new ValidationException("Selling prices cannot be negative.");

        var order = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (order is null)
            throw new NotFoundException(nameof(PurchaseOrder), request.Id);

        if (order.Status == PurchaseStatus.Received)
            throw new ConflictException($"Order '{order.OrderNo}' has already been fully received.");

        if (order.Status == PurchaseStatus.Cancelled)
            throw new ConflictException($"Order '{order.OrderNo}' was cancelled and cannot be received.");

        var itemsById = order.Items.ToDictionary(i => i.Id);
        var receivedAt = DateTime.UtcNow;
        var today = receivedAt.Date;

        foreach (var line in request.Lines)
        {
            if (!itemsById.TryGetValue(line.PurchaseOrderItemId, out var item))
                throw new NotFoundException(nameof(PurchaseOrderItem), line.PurchaseOrderItemId);

            var remaining = item.QuantityOrdered - item.QuantityReceived;
            if (line.Quantity > remaining)
                throw new ValidationException(
                    $"Only {remaining} unit(s) of '{item.MedicineNameEn}' remain to be received, " +
                    $"but {line.Quantity} were requested.");

            var batchNo = line.BatchNo.Trim();
            if (batchNo.Length == 0)
                throw new ValidationException("A batch number is required for every received line.");

            // Accepting already-expired stock into inventory is a goods-reception
            // data-entry error worth blocking here, exactly as the manual
            // receive-stock screen blocks it.
            if (line.ExpiryDate.Date <= today)
                throw new ValidationException("Expiry date must be in the future.");

            var medicine = await _context.Medicines
                .FirstOrDefaultAsync(m => m.Id == item.MedicineId, cancellationToken);
            if (medicine is null)
                throw new NotFoundException(nameof(Medicine), item.MedicineId);
            if (!medicine.IsActive)
                throw new ValidationException(
                    $"Medicine '{item.MedicineNameEn}' is inactive and cannot receive stock.");

            var duplicate = await _context.Batches.AnyAsync(
                b => b.MedicineId == item.MedicineId && b.BatchNo == batchNo, cancellationToken);
            if (duplicate)
                throw new ConflictException($"Batch '{batchNo}' already exists for this medicine.");

            // The batch is priced at the unit price agreed on the order; the retail
            // price is set at receipt, when the pharmacist knows the shelf price.
            var batch = new Batch
            {
                MedicineId = item.MedicineId,
                BatchNo = batchNo,
                ExpiryDate = line.ExpiryDate.Date,
                Quantity = line.Quantity,
                InitialQuantity = line.Quantity,
                PurchasePrice = item.UnitPrice,
                SellingPrice = line.SellingPrice,
                SupplierName = string.IsNullOrWhiteSpace(order.Supplier.NameAr)
                    ? order.Supplier.NameEn
                    : order.Supplier.NameAr.Trim(),
                ReceivedDate = receivedAt,
                IsActive = true,
            };

            _context.Batches.Add(batch);

            _context.StockMovements.Add(new StockMovement
            {
                Batch = batch,
                MovementType = StockMovementType.Receipt,
                QuantityChange = line.Quantity,
                QuantityBefore = 0,
                QuantityAfter = line.Quantity,
                Reason = "Goods receipt",
                Reference = order.OrderNo,
                CreatedAt = receivedAt,
            });

            item.QuantityReceived += line.Quantity;
        }

        if (order.Items.All(i => i.QuantityReceived >= i.QuantityOrdered))
        {
            order.Status = PurchaseStatus.Received;
            order.ReceivedAt = receivedAt;
        }
        else if (order.Status == PurchaseStatus.Draft)
        {
            // Receiving part of a draft confirms the rest: stock is on record now,
            // so the order must not be edited behind it.
            order.Status = PurchaseStatus.Ordered;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseMapper.ToDto(order);
    }
}

// ── Shared assembly & mapping ───────────────────────────────────────────────

/// <summary>Validated order lines plus the order totals computed from them.</summary>
internal record OrderAssembly(
    IReadOnlyList<PurchaseOrderItem> Items,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount
);

internal static class PurchaseOrderAssembler
{
    /// <summary>
    /// Validates the requested lines, loads the medicines and builds the order
    /// lines with server-computed money. Prices stay client-supplied — they are
    /// the price agreed with the supplier — but every total is recomputed here
    /// from the stored tax rate, so a client cannot skew the invoice amounts.
    /// </summary>
    public static async Task<OrderAssembly> AssembleAsync(
        IApplicationDbContext context,
        IReadOnlyList<PurchaseLineRequest> requested,
        decimal discount,
        CancellationToken cancellationToken)
    {
        if (requested is null || requested.Count == 0)
            throw new ValidationException("An order must contain at least one line.");

        if (requested.Any(l => l.Quantity <= 0))
            throw new ValidationException("Every quantity must be greater than zero.");

        if (requested.Any(l => l.UnitPrice < 0))
            throw new ValidationException("Prices cannot be negative.");

        if (discount < 0)
            throw new ValidationException("Discount cannot be negative.");

        var duplicate = requested
            .GroupBy(l => l.MedicineId)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicate is not null)
            throw new ValidationException("Each medicine may appear only once on an order.");

        var medicineIds = requested.Select(l => l.MedicineId).Distinct().ToList();

        var medicines = await context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, cancellationToken);

        var items = new List<PurchaseOrderItem>();
        decimal subtotal = 0m, taxTotal = 0m;

        foreach (var line in requested)
        {
            if (!medicines.TryGetValue(line.MedicineId, out var medicine))
                throw new NotFoundException(nameof(Medicine), line.MedicineId);

            if (!medicine.IsActive)
                throw new ValidationException(
                    $"Medicine '{medicine.NameEn}' is inactive and cannot be ordered.");

            var lineSubtotal = PurchasesPolicy.Round(line.Quantity * line.UnitPrice);
            var lineTax = PurchasesPolicy.Round(lineSubtotal * medicine.TaxRate / 100m);

            subtotal += lineSubtotal;
            taxTotal += lineTax;

            items.Add(new PurchaseOrderItem
            {
                MedicineId = medicine.Id,
                MedicineNameAr = medicine.NameAr,
                MedicineNameEn = medicine.NameEn,
                Barcode = medicine.Barcode,
                TaxRate = medicine.TaxRate,
                QuantityOrdered = line.Quantity,
                QuantityReceived = 0,
                UnitPrice = line.UnitPrice,
                LineSubtotal = lineSubtotal,
                LineTax = lineTax,
                LineTotal = lineSubtotal + lineTax,
            });
        }

        var roundedDiscount = PurchasesPolicy.Round(discount);
        var gross = PurchasesPolicy.Round(subtotal + taxTotal);

        if (roundedDiscount > gross)
            throw new ValidationException(
                $"Discount ({roundedDiscount:0.000}) cannot exceed the order amount ({gross:0.000}).");

        return new OrderAssembly(
            items,
            PurchasesPolicy.Round(subtotal),
            PurchasesPolicy.Round(taxTotal),
            PurchasesPolicy.Round(gross - roundedDiscount));
    }
}

internal static class PurchaseMapper
{
    public static PurchaseOrderDto ToDto(PurchaseOrder order) => new(
        order.Id,
        order.OrderNo,
        order.SupplierId,
        order.Supplier!.NameAr,
        order.Supplier!.NameEn,
        order.OrderDate,
        order.ExpectedDeliveryDate,
        order.Status,
        order.Subtotal,
        order.TaxAmount,
        order.DiscountAmount,
        order.TotalAmount,
        order.Notes,
        order.ReceivedAt,
        order.CancelledAt,
        order.CancelReason,
        order.Items.Sum(i => i.QuantityOrdered),
        order.Items
            .OrderBy(i => i.Id)
            .Select(i => new PurchaseOrderItemDto(
                i.Id, i.MedicineId,
                i.MedicineNameAr, i.MedicineNameEn, i.Barcode, i.TaxRate,
                i.QuantityOrdered, i.QuantityReceived, i.UnitPrice,
                i.LineSubtotal, i.LineTax, i.LineTotal))
            .ToList());
}