using MediatR;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.Application.Features.Reports;

public record ReportsDashboardDto(
    DateTime FromDate,
    DateTime ToDate,
    ReportSummaryDto Summary,
    IReadOnlyList<DailyReportPointDto> Daily,
    IReadOnlyList<TopMedicineReportDto> TopMedicines,
    IReadOnlyList<PaymentBreakdownDto> Payments,
    IReadOnlyList<SupplierSpendDto> SupplierSpend,
    InventoryReportDto Inventory
);

public record ReportSummaryDto(
    int SalesCount,
    int ReturnedSalesCount,
    int UnitsSold,
    decimal Revenue,
    decimal TaxCollected,
    decimal DiscountsGiven,
    decimal AverageBasket,
    int ReceivedOrdersCount,
    decimal PurchaseCost,
    int ActiveSuppliersCount
);

public record DailyReportPointDto(
    DateTime Date,
    int SalesCount,
    int UnitsSold,
    decimal Revenue,
    decimal PurchaseCost
);

public record TopMedicineReportDto(
    int MedicineId,
    string NameAr,
    string NameEn,
    int UnitsSold,
    decimal Revenue,
    int SaleLines
);

public record PaymentBreakdownDto(
    PaymentMethod PaymentMethod,
    int SalesCount,
    decimal Revenue
);

public record SupplierSpendDto(
    int SupplierId,
    string NameAr,
    string NameEn,
    int OrdersCount,
    decimal TotalAmount
);

public record InventoryReportDto(
    int TotalMedicines,
    int TotalBatches,
    int TotalUnits,
    decimal TotalStockValue,
    int LowStockCount,
    int OutOfStockCount,
    int ExpiringSoonBatchCount,
    int ExpiredBatchCount,
    decimal ExpiredStockValue
);

public record GetReportsDashboardQuery(
    DateTime? FromDate = null,
    DateTime? ToDate = null
) : IRequest<ReportsDashboardDto>;