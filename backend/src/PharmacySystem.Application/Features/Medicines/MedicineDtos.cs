namespace PharmacySystem.Application.Features.Medicines;

public record MedicineDto(
    int Id,
    string NameAr,
    string NameEn,
    string Barcode,
    string? JFDARegistrationNo,
    string Form,
    string? Strength,
    string? Manufacturer,
    int TaxRate,
    bool IsControlled,
    int ControlledLevel,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateMedicineCommand(
    string NameAr,
    string NameEn,
    string Barcode,
    string? JFDARegistrationNo,
    string Form,
    string? Strength,
    string? Manufacturer,
    int TaxRate = 16,
    bool IsControlled = false,
    int ControlledLevel = 0
) : IRequest<int>;

public record UpdateMedicineCommand(
    int Id,
    string NameAr,
    string NameEn,
    string Barcode,
    string? JFDARegistrationNo,
    string Form,
    string? Strength,
    string? Manufacturer,
    int TaxRate,
    bool IsControlled,
    int ControlledLevel,
    bool IsActive
) : IRequest<Unit>;

public record GetMedicinesQuery(
    string? SearchTerm = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<MedicineDto>>;

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
