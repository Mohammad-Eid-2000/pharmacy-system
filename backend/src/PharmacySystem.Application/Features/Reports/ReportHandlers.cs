using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;
using PharmacySystem.Application.Features.Inventory;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Reports;

public class GetReportsDashboardHandler
    : IRequestHandler<GetReportsDashboardQuery, ReportsDashboardDto>
{
    private readonly IApplicationDbContext _context;

    public GetReportsDashboardHandler(IApplicationDbContext context) => _context = context;

    public async Task<ReportsDashboardDto> Handle(
        GetReportsDashboardQuery request, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        var from = (request.FromDate ?? today.AddDays(-29)).Date;
        var to = (request.ToDate ?? today).Date;

        if (to < from)
            throw new ValidationException("The report end date cannot be before the start date.");

        // Keep the dashboard bounded: a huge date range makes daily charts and
        // SQL result sets hard to read and expensive to compute.
        if ((to - from).TotalDays > 366)
            throw new ValidationException("The report date range cannot exceed 366 days.");

        var toExclusive = to.AddDays(1);
        var completedSales = _context.Sales.Where(s =>
            s.Status == SaleStatus.Completed &&
            s.SaleDate >= from && s.SaleDate < toExclusive);
        var allSales = _context.Sales.Where(s =>
            s.SaleDate >= from && s.SaleDate < toExclusive);
        var receivedOrders = _context.PurchaseOrders.Where(o =>
            o.Status == PurchaseStatus.Received &&
            o.ReceivedAt >= from && o.ReceivedAt < toExclusive);

        var salesStats = await completedSales
            .GroupBy(_ => 1)
            .Select(g => new
            {
                SalesCount = g.Count(),
                UnitsSold = g.SelectMany(s => s.Items).Sum(i => (int?)i.Quantity) ?? 0,
                Revenue = g.Sum(s => (decimal?)s.TotalAmount) ?? 0m,
                TaxCollected = g.Sum(s => (decimal?)s.TaxAmount) ?? 0m,
                DiscountsGiven = g.Sum(s => (decimal?)s.DiscountAmount) ?? 0m,
            })
            .FirstOrDefaultAsync(cancellationToken);

        var returnedCount = await allSales.CountAsync(
            s => s.Status == SaleStatus.Returned, cancellationToken);

        var receivedStats = await receivedOrders
            .GroupBy(_ => 1)
            .Select(g => new
            {
                OrdersCount = g.Count(),
                PurchaseCost = g.Sum(o => (decimal?)o.TotalAmount) ?? 0m,
            })
            .FirstOrDefaultAsync(cancellationToken);

        var activeSuppliers = await _context.Suppliers
            .CountAsync(s => s.IsActive, cancellationToken);

        // Project at invoice level first. SQL Server can translate the item sum
        // and the date grouping independently; regrouping item rows while also
        // taking the invoice total is not portable across EF Core providers.
        var salesByDayRows = await completedSales
            .Select(s => new
            {
                Date = s.SaleDate.Date,
                Revenue = s.TotalAmount,
                UnitsSold = s.Items.Sum(i => i.Quantity),
            })
            .ToListAsync(cancellationToken);

        var salesByDay = salesByDayRows
            .GroupBy(x => x.Date)
            .Select(g => new
            {
                Date = g.Key,
                SalesCount = g.Count(),
                UnitsSold = g.Sum(x => x.UnitsSold),
                Revenue = g.Sum(x => x.Revenue),
            })
            .ToList();

        var purchasesByDay = await receivedOrders
            .GroupBy(o => o.ReceivedAt!.Value.Date)
            .Select(g => new
            {
                Date = g.Key,
                PurchaseCost = g.Sum(o => (decimal?)o.TotalAmount) ?? 0m,
            })
            .ToListAsync(cancellationToken);

        var dailySalesLookup = salesByDay.ToDictionary(x => x.Date);
        var dailyPurchasesLookup = purchasesByDay.ToDictionary(x => x.Date);
        var daily = Enumerable.Range(0, (to - from).Days + 1)
            .Select(offset =>
            {
                var date = from.AddDays(offset);
                dailySalesLookup.TryGetValue(date, out var sales);
                dailyPurchasesLookup.TryGetValue(date, out var purchases);
                return new DailyReportPointDto(
                    date,
                    sales?.SalesCount ?? 0,
                    sales?.UnitsSold ?? 0,
                    sales?.Revenue ?? 0m,
                    purchases?.PurchaseCost ?? 0m);
            })
            .ToList();

        var topMedicineRows = await _context.SaleItems
            .Where(i => i.Sale.Status == SaleStatus.Completed &&
                        i.Sale.SaleDate >= from && i.Sale.SaleDate < toExclusive)
            .Select(i => new
            {
                i.MedicineId,
                i.MedicineNameAr,
                i.MedicineNameEn,
                i.Quantity,
                i.LineTotal,
            })
            .ToListAsync(cancellationToken);

        var topMedicines = topMedicineRows
            .GroupBy(i => new { i.MedicineId, i.MedicineNameAr, i.MedicineNameEn })
            .Select(g => new TopMedicineReportDto(
                g.Key.MedicineId,
                g.Key.MedicineNameAr,
                g.Key.MedicineNameEn,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.LineTotal),
                g.Count()))
            .OrderByDescending(x => x.UnitsSold)
            .ThenByDescending(x => x.Revenue)
            .Take(10)
            .ToList();

        var paymentRows = await completedSales
            .Select(s => new { s.PaymentMethod, s.TotalAmount })
            .ToListAsync(cancellationToken);
        var payments = paymentRows
            .GroupBy(x => x.PaymentMethod)
            .Select(g => new PaymentBreakdownDto(
                g.Key,
                g.Count(),
                g.Sum(x => x.TotalAmount)))
            .OrderByDescending(x => x.Revenue)
            .ToList();

        var supplierRows = await receivedOrders
            .Select(o => new
            {
                o.SupplierId,
                NameAr = o.Supplier.NameAr,
                NameEn = o.Supplier.NameEn,
                o.TotalAmount,
            })
            .ToListAsync(cancellationToken);
        var supplierSpend = supplierRows
            .GroupBy(o => new { o.SupplierId, o.NameAr, o.NameEn })
            .Select(g => new SupplierSpendDto(
                g.Key.SupplierId,
                g.Key.NameAr,
                g.Key.NameEn,
                g.Count(),
                g.Sum(o => o.TotalAmount)))
            .OrderByDescending(x => x.TotalAmount)
            .Take(10)
            .ToList();

        var inventory = await BuildInventoryReportAsync(today, cancellationToken);

        var revenue = salesStats?.Revenue ?? 0m;
        var salesCount = salesStats?.SalesCount ?? 0;
        var summary = new ReportSummaryDto(
            salesCount,
            returnedCount,
            salesStats?.UnitsSold ?? 0,
            revenue,
            salesStats?.TaxCollected ?? 0m,
            salesStats?.DiscountsGiven ?? 0m,
            salesCount == 0 ? 0m : Round(revenue / salesCount),
            receivedStats?.OrdersCount ?? 0,
            receivedStats?.PurchaseCost ?? 0m,
            activeSuppliers);

        return new ReportsDashboardDto(from, to, summary, daily, topMedicines, payments, supplierSpend, inventory);
    }

    private async Task<InventoryReportDto> BuildInventoryReportAsync(
        DateTime today, CancellationToken cancellationToken)
    {
        var soonCutoff = today.AddDays(InventoryPolicy.ExpiringSoonDays);
        var stockLevels = await _context.Medicines
            .Where(m => m.IsActive)
            .Select(m => new
            {
                m.ReorderLevel,
                TotalQuantity = m.Batches.Where(b => b.IsActive).Sum(b => (int?)b.Quantity) ?? 0,
            })
            .ToListAsync(cancellationToken);

        var batches = _context.Batches.Where(b => b.IsActive && b.Quantity > 0);
        var stats = await batches
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalBatches = g.Count(),
                TotalUnits = g.Sum(b => (int?)b.Quantity) ?? 0,
                TotalStockValue = g.Sum(b => (decimal?)(b.Quantity * b.PurchasePrice)) ?? 0m,
                ExpiredBatchCount = g.Count(b => b.ExpiryDate < today),
                ExpiringSoonBatchCount = g.Count(b => b.ExpiryDate >= today && b.ExpiryDate <= soonCutoff),
                ExpiredStockValue = g.Where(b => b.ExpiryDate < today)
                    .Sum(b => (decimal?)(b.Quantity * b.PurchasePrice)) ?? 0m,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new InventoryReportDto(
            stockLevels.Count,
            stats?.TotalBatches ?? 0,
            stats?.TotalUnits ?? 0,
            stats?.TotalStockValue ?? 0m,
            stockLevels.Count(x => x.TotalQuantity > 0 && x.TotalQuantity <= x.ReorderLevel),
            stockLevels.Count(x => x.TotalQuantity <= 0),
            stats?.ExpiringSoonBatchCount ?? 0,
            stats?.ExpiredBatchCount ?? 0,
            stats?.ExpiredStockValue ?? 0m);
    }

    private static decimal Round(decimal value) =>
        Math.Round(value, 3, MidpointRounding.AwayFromZero);
}