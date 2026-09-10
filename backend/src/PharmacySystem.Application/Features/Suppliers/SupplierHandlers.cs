using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Entities;

namespace PharmacySystem.Application.Features.Suppliers;

// ── Queries ─────────────────────────────────────────────────────────────────

public class GetSuppliersHandler : IRequestHandler<GetSuppliersQuery, PagedResult<SupplierDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSuppliersHandler(IApplicationDbContext context) => _context = context;

    public async Task<PagedResult<SupplierDto>> Handle(
        GetSuppliersQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = _context.Suppliers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(s => s.NameAr.Contains(term) ||
                                     s.NameEn.Contains(term) ||
                                     (s.TaxId != null && s.TaxId.Contains(term)) ||
                                     (s.Mobile != null && s.Mobile.Contains(term)) ||
                                     (s.Phone != null && s.Phone.Contains(term)));
        }

        if (request.IsActive.HasValue)
            query = query.Where(s => s.IsActive == request.IsActive.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(s => s.NameAr)
            .ThenBy(s => s.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SupplierDto(
                s.Id,
                s.NameAr,
                s.NameEn,
                s.TaxId,
                s.Phone,
                s.Mobile,
                s.Email,
                s.Address,
                s.City,
                s.Notes,
                s.IsActive,
                s.PurchaseOrders.Count(),
                s.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<SupplierDto>(
            items, totalCount, page, pageSize,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }
}

// ── Commands ────────────────────────────────────────────────────────────────

public class CreateSupplierHandler : IRequestHandler<CreateSupplierCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateSupplierHandler(IApplicationDbContext context) => _context = context;

    public async Task<int> Handle(CreateSupplierCommand request, CancellationToken cancellationToken)
    {
        var nameAr = Trim(request.NameAr);
        if (string.IsNullOrWhiteSpace(nameAr))
            throw new ValidationException("The Arabic supplier name is required.");

        // The Arabic commercial name is what staff pick suppliers by in the
        // buying screens, so it must be unambiguous.
        var duplicateName = await _context.Suppliers.AnyAsync(
            s => s.NameAr == nameAr, cancellationToken);
        if (duplicateName)
            throw new ConflictException($"A supplier named '{nameAr}' already exists.");

        var taxId = Trim(request.TaxId);
        if (taxId is not null)
        {
            var duplicateTax = await _context.Suppliers.AnyAsync(
                s => s.TaxId == taxId, cancellationToken);
            if (duplicateTax)
                throw new ConflictException($"A supplier with tax number '{taxId}' already exists.");
        }

        var supplier = new Supplier
        {
            NameAr = nameAr,
            NameEn = Trim(request.NameEn) ?? string.Empty,
            TaxId = taxId,
            Phone = Trim(request.Phone),
            Mobile = Trim(request.Mobile),
            Email = Trim(request.Email),
            Address = Trim(request.Address),
            City = Trim(request.City),
            Notes = Trim(request.Notes),
            IsActive = true,
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync(cancellationToken);
        return supplier.Id;
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public class UpdateSupplierHandler : IRequestHandler<UpdateSupplierCommand, Unit>
{
    private readonly IApplicationDbContext _context;

    public UpdateSupplierHandler(IApplicationDbContext context) => _context = context;

    public async Task<Unit> Handle(UpdateSupplierCommand request, CancellationToken cancellationToken)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
        if (supplier is null)
            throw new NotFoundException(nameof(Supplier), request.Id);

        var nameAr = Trim(request.NameAr);
        if (string.IsNullOrWhiteSpace(nameAr))
            throw new ValidationException("The Arabic supplier name is required.");

        var duplicateName = await _context.Suppliers.AnyAsync(
            s => s.NameAr == nameAr && s.Id != request.Id, cancellationToken);
        if (duplicateName)
            throw new ConflictException($"A supplier named '{nameAr}' already exists.");

        var taxId = Trim(request.TaxId);
        if (taxId is not null)
        {
            var duplicateTax = await _context.Suppliers.AnyAsync(
                s => s.TaxId == taxId && s.Id != request.Id, cancellationToken);
            if (duplicateTax)
                throw new ConflictException($"A supplier with tax number '{taxId}' already exists.");
        }

        supplier.NameAr = nameAr;
        supplier.NameEn = Trim(request.NameEn) ?? string.Empty;
        supplier.TaxId = taxId;
        supplier.Phone = Trim(request.Phone);
        supplier.Mobile = Trim(request.Mobile);
        supplier.Email = Trim(request.Email);
        supplier.Address = Trim(request.Address);
        supplier.City = Trim(request.City);
        supplier.Notes = Trim(request.Notes);
        supplier.IsActive = request.IsActive;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}