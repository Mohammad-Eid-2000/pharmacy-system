using MediatR;
using PharmacySystem.Application.Features.Medicines;

namespace PharmacySystem.Application.Features.Suppliers;

/// <summary>Supplier master-data record as the buying screens see it.</summary>
public record SupplierDto(
    int Id,
    string NameAr,
    string NameEn,
    string? TaxId,
    string? Phone,
    string? Mobile,
    string? Email,
    string? Address,
    string? City,
    string? Notes,
    bool IsActive,
    int PurchaseOrderCount,
    DateTime CreatedAt
);

// ── Queries ─────────────────────────────────────────────────────────────────

public record GetSuppliersQuery(
    string? SearchTerm = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<SupplierDto>>;

// ── Commands ────────────────────────────────────────────────────────────────

public record CreateSupplierCommand(
    string NameAr,
    string NameEn,
    string? TaxId = null,
    string? Phone = null,
    string? Mobile = null,
    string? Email = null,
    string? Address = null,
    string? City = null,
    string? Notes = null
) : IRequest<int>;

public record UpdateSupplierCommand(
    int Id,
    string NameAr,
    string NameEn,
    string? TaxId,
    string? Phone,
    string? Mobile,
    string? Email,
    string? Address,
    string? City,
    string? Notes,
    bool IsActive
) : IRequest<Unit>;