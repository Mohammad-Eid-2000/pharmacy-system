using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Entities;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Sales;

/// <summary>Selling rules kept in one place so the till and the reports agree.</summary>
public static class SalesPolicy
{
    /// <summary>
    /// The Jordanian dinar subdivides into 1000 fils, so every monetary amount is
    /// rounded to 3 decimals. Rounding each line as it is computed — rather than
    /// only at the end — keeps the printed line amounts adding up to the printed
    /// total exactly, which is what a customer checks on the receipt.
    /// </summary>
    public const int MoneyDecimals = 3;

    public static decimal Round(decimal value) =>
        Math.Round(value, MoneyDecimals, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Batches that may still be dispensed. Expired stock is excluded outright:
    /// selling it is a patient-safety failure, not a rounding preference. A batch
    /// expiring today is still valid, matching the inventory screen's classification.
    /// </summary>
    public static IQueryable<Batch> Sellable(IQueryable<Batch> batches, DateTime today) =>
        batches.Where(b => b.IsActive && b.Quantity > 0 && b.ExpiryDate >= today);
}

// ── Queries ─────────────────────────────────────────────────────────────────

/// <summary>
/// The till's product lookup: price and sellable quantity per medicine.
/// </summary>
public class GetSellableProductsHandler
    : IRequestHandler<GetSellableProductsQuery, PagedResult<SellableProductDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSellableProductsHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<SellableProductDto>> Handle(
        GetSellableProductsQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var today = DateTime.UtcNow.Date;

        var medicines = _context.Medicines.Where(m => m.IsActive);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            medicines = medicines.Where(m => m.NameAr.Contains(term) ||
                                             m.NameEn.Contains(term) ||
                                             m.Barcode.Contains(term));
        }

        var projected = medicines.Select(m => new
        {
            m.Id,
            m.NameAr,
            m.NameEn,
            m.Barcode,
            m.Form,
            m.Strength,
            m.IsControlled,
            m.ControlledLevel,
            m.TaxRate,
            AvailableQuantity = m.Batches
                .Where(b => b.IsActive && b.Quantity > 0 && b.ExpiryDate >= today)
                .Sum(b => (int?)b.Quantity) ?? 0,
            NearestExpiryDate = m.Batches
                .Where(b => b.IsActive && b.Quantity > 0 && b.ExpiryDate >= today)
                .Min(b => (DateTime?)b.ExpiryDate),
            // The price shown is the price of the batch that would actually be
            // dispensed next, since batches of the same medicine can differ in price.
            UnitPrice = m.Batches
                .Where(b => b.IsActive && b.Quantity > 0 && b.ExpiryDate >= today)
                .OrderBy(b => b.ExpiryDate)
                .ThenBy(b => b.Id)
                .Select(b => (decimal?)b.SellingPrice)
                .FirstOrDefault() ?? 0m,
        });

        if (request.InStockOnly)
        {
            projected = projected.Where(x => x.AvailableQuantity > 0);
        }

        var totalCount = await projected.CountAsync(cancellationToken);

        var rows = await projected
            .OrderBy(x => x.NameEn)
            .ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new SellableProductDto(
            x.Id, x.NameAr, x.NameEn, x.Barcode, x.Form, x.Strength,
            x.IsControlled, x.ControlledLevel, x.TaxRate,
            x.UnitPrice, x.AvailableQuantity, x.NearestExpiryDate)).ToList();

        return new PagedResult<SellableProductDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

public class GetSalesHandler : IRequestHandler<GetSalesQuery, PagedResult<SaleListItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSalesHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<SaleListItemDto>> Handle(
        GetSalesQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = _context.Sales.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(s => s.InvoiceNo.Contains(term) ||
                                     (s.CustomerName != null && s.CustomerName.Contains(term)) ||
                                     (s.PrescriptionNo != null && s.PrescriptionNo.Contains(term)));
        }

        if (request.Status.HasValue)
            query = query.Where(s => s.Status == request.Status.Value);

        if (request.PaymentMethod.HasValue)
            query = query.Where(s => s.PaymentMethod == request.PaymentMethod.Value);

        if (request.FromDate.HasValue)
        {
            var from = request.FromDate.Value.Date;
            query = query.Where(s => s.SaleDate >= from);
        }

        if (request.ToDate.HasValue)
        {
            // Inclusive of the whole end day: a filter "to 31 Aug" must include
            // a sale rung up at 19:00 on 31 Aug.
            var toExclusive = request.ToDate.Value.Date.AddDays(1);
            query = query.Where(s => s.SaleDate < toExclusive);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SaleListItemDto(
                s.Id,
                s.InvoiceNo,
                s.SaleDate,
                s.TotalAmount,
                s.DiscountAmount,
                s.PaymentMethod,
                s.Status,
                s.CustomerName,
                s.PrescriptionNo,
                s.Items.Count,
                s.Items.Sum(i => (int?)i.Quantity) ?? 0))
            .ToListAsync(cancellationToken);

        return new PagedResult<SaleListItemDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

public class GetSaleByIdHandler : IRequestHandler<GetSaleByIdQuery, SaleDto>
{
    private readonly IApplicationDbContext _context;

    public GetSaleByIdHandler(IApplicationDbContext context) => _context = context;

    public async Task<SaleDto> Handle(GetSaleByIdQuery request, CancellationToken cancellationToken)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (sale is null)
            throw new NotFoundException(nameof(Sale), request.Id);

        return SalesMapper.ToDto(sale);
    }
}

public class GetSalesSummaryHandler : IRequestHandler<GetSalesSummaryQuery, SalesSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetSalesSummaryHandler(IApplicationDbContext context) => _context = context;

    public async Task<SalesSummaryDto> Handle(
        GetSalesSummaryQuery request, CancellationToken cancellationToken)
    {
        var day = (request.Date ?? DateTime.UtcNow).Date;
        var nextDay = day.AddDays(1);

        var daySales = _context.Sales.Where(s => s.SaleDate >= day && s.SaleDate < nextDay);

        // Returned invoices still happened, so they are counted separately rather
        // than deleted — but they must not inflate the day's revenue.
        var completed = daySales.Where(s => s.Status == SaleStatus.Completed);

        var stats = await completed
            .GroupBy(_ => 1)
            .Select(g => new
            {
                SalesCount = g.Count(),
                Revenue = g.Sum(s => (decimal?)s.TotalAmount) ?? 0m,
                TaxCollected = g.Sum(s => (decimal?)s.TaxAmount) ?? 0m,
                DiscountsGiven = g.Sum(s => (decimal?)s.DiscountAmount) ?? 0m,
                CashRevenue = g
                    .Where(s => s.PaymentMethod == PaymentMethod.Cash)
                    .Sum(s => (decimal?)s.TotalAmount) ?? 0m,
                UnitsSold = g.Sum(s => (int?)s.Items.Sum(i => (int?)i.Quantity)) ?? 0,
            })
            .FirstOrDefaultAsync(cancellationToken);

        var returnedCount = await daySales
            .CountAsync(s => s.Status == SaleStatus.Returned, cancellationToken);

        var salesCount = stats?.SalesCount ?? 0;
        var revenue = stats?.Revenue ?? 0m;

        return new SalesSummaryDto(
            Date: day,
            SalesCount: salesCount,
            ReturnedCount: returnedCount,
            UnitsSold: stats?.UnitsSold ?? 0,
            Revenue: revenue,
            TaxCollected: stats?.TaxCollected ?? 0m,
            DiscountsGiven: stats?.DiscountsGiven ?? 0m,
            AverageBasket: salesCount == 0 ? 0m : SalesPolicy.Round(revenue / salesCount),
            CashRevenue: stats?.CashRevenue ?? 0m,
            NonCashRevenue: revenue - (stats?.CashRevenue ?? 0m));
    }
}

// ── Commands ────────────────────────────────────────────────────────────────

public class CreateSaleHandler : IRequestHandler<CreateSaleCommand, SaleDto>
{
    private readonly IApplicationDbContext _context;

    public CreateSaleHandler(IApplicationDbContext context) => _context = context;

    public async Task<SaleDto> Handle(CreateSaleCommand request, CancellationToken cancellationToken)
    {
        if (request.Items is null || request.Items.Count == 0)
            throw new ValidationException("A sale must contain at least one item.");

        if (request.Items.Any(i => i.Quantity <= 0))
            throw new ValidationException("Every quantity must be greater than zero.");

        if (request.DiscountAmount < 0)
            throw new ValidationException("Discount cannot be negative.");

        // The same medicine arriving on two lines is merged before anything is
        // checked. Validating the lines separately would let 60 + 60 units both
        // pass against 100 in stock and overdraw the batch.
        var requested = request.Items
            .GroupBy(i => i.MedicineId)
            .Select(g => new { MedicineId = g.Key, Quantity = g.Sum(i => i.Quantity) })
            .ToList();

        var today = DateTime.UtcNow.Date;
        var medicineIds = requested.Select(r => r.MedicineId).ToList();

        var medicines = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, cancellationToken);

        foreach (var line in requested)
        {
            if (!medicines.TryGetValue(line.MedicineId, out var medicine))
                throw new NotFoundException(nameof(Medicine), line.MedicineId);

            if (!medicine.IsActive)
                throw new ValidationException($"Medicine '{medicine.NameEn}' is no longer available for sale.");
        }

        // Jordanian regulations do not allow a controlled medicine to leave the
        // pharmacy without a prescription on record, so the sale is refused
        // outright rather than saved with a blank reference.
        if (string.IsNullOrWhiteSpace(request.PrescriptionNo))
        {
            var controlled = requested
                .Select(r => medicines[r.MedicineId])
                .FirstOrDefault(m => m.IsControlled);

            if (controlled is not null)
                throw new ValidationException(
                    $"A prescription number is required to dispense the controlled medicine '{controlled.NameEn}'.");
        }

        // Load every candidate batch in one query, then allocate in memory so the
        // running quantities stay consistent across lines.
        var candidateBatches = await SalesPolicy
            .Sellable(_context.Batches.Where(b => medicineIds.Contains(b.MedicineId)), today)
            .OrderBy(b => b.ExpiryDate)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

        var byMedicine = candidateBatches
            .GroupBy(b => b.MedicineId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var sale = new Sale
        {
            SaleDate = DateTime.UtcNow,
            PaymentMethod = request.PaymentMethod,
            Status = SaleStatus.Completed,
            CustomerName = Trim(request.CustomerName),
            PrescriptionNo = Trim(request.PrescriptionNo),
            Notes = Trim(request.Notes),
        };

        // The allocation is planned before anything is mutated. Deducting stock
        // first and validating the money afterwards would leave a rejected sale
        // having already taken units out of the batches it touched.
        var plan = new List<(Batch Batch, Medicine Medicine, int Take)>();
        var planned = new Dictionary<int, int>();
        decimal subtotal = 0m, taxTotal = 0m;

        foreach (var line in requested)
        {
            var medicine = medicines[line.MedicineId];
            var available = byMedicine.TryGetValue(line.MedicineId, out var batches)
                ? batches
                : new List<Batch>();

            var onHand = available.Sum(b => b.Quantity);
            if (onHand < line.Quantity)
                throw new ValidationException(
                    $"Only {onHand} unit(s) of '{medicine.NameEn}' are available to sell, but {line.Quantity} were requested.");

            var remaining = line.Quantity;

            // First-expired-first-out: the stock closest to expiry leaves first,
            // which is what keeps a pharmacy from writing off usable medicine.
            foreach (var batch in available)
            {
                if (remaining == 0) break;

                // Quantity already promised to an earlier line of this same basket.
                planned.TryGetValue(batch.Id, out var alreadyPlanned);
                var free = batch.Quantity - alreadyPlanned;
                if (free <= 0) continue;

                var take = Math.Min(free, remaining);
                remaining -= take;
                planned[batch.Id] = alreadyPlanned + take;
                plan.Add((batch, medicine, take));

                var lineSubtotal = SalesPolicy.Round(take * batch.SellingPrice);
                var lineTax = SalesPolicy.Round(lineSubtotal * medicine.TaxRate / 100m);

                subtotal += lineSubtotal;
                taxTotal += lineTax;
            }
        }

        var discount = SalesPolicy.Round(request.DiscountAmount);
        var gross = SalesPolicy.Round(subtotal + taxTotal);

        if (discount > gross)
            throw new ValidationException(
                $"Discount ({discount:0.000}) cannot exceed the invoice amount ({gross:0.000}).");

        var total = SalesPolicy.Round(gross - discount);

        // Only cash produces change. For card, insurance and wallet payments the
        // exact amount is captured, so recording a tendered amount would be fiction.
        decimal amountPaid, changeDue;
        if (request.PaymentMethod == PaymentMethod.Cash)
        {
            amountPaid = SalesPolicy.Round(request.AmountPaid);
            if (amountPaid < total)
                throw new ValidationException(
                    $"Amount paid ({amountPaid:0.000}) is less than the total due ({total:0.000}).");
            changeDue = SalesPolicy.Round(amountPaid - total);
        }
        else
        {
            amountPaid = total;
            changeDue = 0m;
        }

        sale.Subtotal = SalesPolicy.Round(subtotal);
        sale.TaxAmount = SalesPolicy.Round(taxTotal);
        sale.DiscountAmount = discount;
        sale.TotalAmount = total;
        sale.AmountPaid = amountPaid;
        sale.ChangeDue = changeDue;
        sale.InvoiceNo = await NextInvoiceNoAsync(sale.SaleDate, cancellationToken);

        // Past this point the sale is accepted, so stock may be deducted. Every
        // dispensed unit is written to the same audit trail the inventory screen
        // reads, tagged with the invoice so stock and sales reconcile.
        foreach (var (batch, medicine, take) in plan)
        {
            var before = batch.Quantity;
            batch.Quantity -= take;

            var lineSubtotal = SalesPolicy.Round(take * batch.SellingPrice);
            var lineTax = SalesPolicy.Round(lineSubtotal * medicine.TaxRate / 100m);

            sale.Items.Add(new SaleItem
            {
                MedicineId = medicine.Id,
                BatchId = batch.Id,
                MedicineNameAr = medicine.NameAr,
                MedicineNameEn = medicine.NameEn,
                BatchNo = batch.BatchNo,
                ExpiryDate = batch.ExpiryDate,
                Quantity = take,
                UnitPrice = batch.SellingPrice,
                TaxRate = medicine.TaxRate,
                LineSubtotal = lineSubtotal,
                LineTax = lineTax,
                LineTotal = lineSubtotal + lineTax,
            });

            _context.StockMovements.Add(new StockMovement
            {
                BatchId = batch.Id,
                MovementType = StockMovementType.Dispense,
                QuantityChange = -take,
                QuantityBefore = before,
                QuantityAfter = batch.Quantity,
                Reason = "Counter sale",
                Reference = sale.InvoiceNo,
                CreatedAt = sale.SaleDate,
            });
        }

        _context.Sales.Add(sale);

        await _context.SaveChangesAsync(cancellationToken);

        return SalesMapper.ToDto(sale);
    }

    /// <summary>
    /// Builds the next invoice number for the day, e.g. INV-20260831-0007.
    /// </summary>
    /// <remarks>
    /// The sequence is derived from the numbers already stored rather than from a
    /// row count, so returning or voiding a sale never causes a number to be
    /// reused. Two tills checking out in the same instant could still compute the
    /// same number; the unique index on InvoiceNo is what stops a duplicate from
    /// being persisted, and the second caller must retry.
    /// </remarks>
    private async Task<string> NextInvoiceNoAsync(DateTime saleDate, CancellationToken cancellationToken)
    {
        var prefix = $"INV-{saleDate:yyyyMMdd}-";

        var lastNo = await _context.Sales
            .Where(s => s.InvoiceNo.StartsWith(prefix))
            .OrderByDescending(s => s.InvoiceNo)
            .Select(s => s.InvoiceNo)
            .FirstOrDefaultAsync(cancellationToken);

        var sequence = 1;
        if (lastNo is not null &&
            int.TryParse(lastNo[prefix.Length..], out var lastSequence))
        {
            sequence = lastSequence + 1;
        }

        return prefix + sequence.ToString("D4");
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public class ReturnSaleHandler : IRequestHandler<ReturnSaleCommand, SaleDto>
{
    private readonly IApplicationDbContext _context;

    public ReturnSaleHandler(IApplicationDbContext context) => _context = context;

    public async Task<SaleDto> Handle(ReturnSaleCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationException("A reason is required to return a sale.");

        var sale = await _context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == request.SaleId, cancellationToken);

        if (sale is null)
            throw new NotFoundException(nameof(Sale), request.SaleId);

        // Without this guard a sale could be returned repeatedly, each time
        // putting the same units back and inventing stock that never existed.
        if (sale.Status == SaleStatus.Returned)
            throw new ConflictException($"Invoice '{sale.InvoiceNo}' has already been returned.");

        var batchIds = sale.Items.Select(i => i.BatchId).Distinct().ToList();
        var batches = await _context.Batches
            .Where(b => batchIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, cancellationToken);

        var returnedAt = DateTime.UtcNow;

        foreach (var item in sale.Items)
        {
            // The batch is looked up rather than assumed: stock goes back to the
            // exact batch it left, which is why the line stores the batch id.
            if (!batches.TryGetValue(item.BatchId, out var batch))
                throw new NotFoundException(nameof(Batch), item.BatchId);

            var before = batch.Quantity;
            batch.Quantity += item.Quantity;

            _context.StockMovements.Add(new StockMovement
            {
                BatchId = batch.Id,
                MovementType = StockMovementType.CustomerReturn,
                QuantityChange = item.Quantity,
                QuantityBefore = before,
                QuantityAfter = batch.Quantity,
                Reason = request.Reason.Trim(),
                Reference = sale.InvoiceNo,
                CreatedAt = returnedAt,
            });
        }

        sale.Status = SaleStatus.Returned;
        sale.ReturnedAt = returnedAt;
        sale.ReturnReason = request.Reason.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return SalesMapper.ToDto(sale);
    }
}

internal static class SalesMapper
{
    public static SaleDto ToDto(Sale sale) => new(
        sale.Id,
        sale.InvoiceNo,
        sale.SaleDate,
        sale.Subtotal,
        sale.TaxAmount,
        sale.DiscountAmount,
        sale.TotalAmount,
        sale.PaymentMethod,
        sale.AmountPaid,
        sale.ChangeDue,
        sale.Status,
        sale.CustomerName,
        sale.PrescriptionNo,
        sale.CashierName,
        sale.Notes,
        sale.ReturnedAt,
        sale.ReturnReason,
        sale.Items.Sum(i => i.Quantity),
        sale.Items
            .OrderBy(i => i.ExpiryDate)
            .ThenBy(i => i.Id)
            .Select(i => new SaleItemDto(
                i.Id, i.MedicineId, i.BatchId,
                i.MedicineNameAr, i.MedicineNameEn, i.BatchNo, i.ExpiryDate,
                i.Quantity, i.UnitPrice, i.TaxRate,
                i.LineSubtotal, i.LineTax, i.LineTotal))
            .ToList());
}
