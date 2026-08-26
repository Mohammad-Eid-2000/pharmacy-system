using MediatR;
using PharmacySystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common;

namespace PharmacySystem.Application.Features.Medicines;

public class CreateMedicineHandler : IRequestHandler<CreateMedicineCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateMedicineHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateMedicineCommand request, CancellationToken cancellationToken)
    {
        var barcodeTaken = await _context.Medicines
            .AnyAsync(m => m.Barcode == request.Barcode, cancellationToken);
        if (barcodeTaken)
            throw new ConflictException($"A medicine with barcode '{request.Barcode}' already exists.");

        var medicine = new Medicine
        {
            NameAr = request.NameAr,
            NameEn = request.NameEn,
            Barcode = request.Barcode,
            JFDARegistrationNo = request.JFDARegistrationNo,
            Form = request.Form,
            Strength = request.Strength,
            Manufacturer = request.Manufacturer,
            TaxRate = request.TaxRate,
            IsControlled = request.IsControlled,
            ControlledLevel = request.ControlledLevel,
            IsActive = true
        };

        _context.Medicines.Add(medicine);
        await _context.SaveChangesAsync(cancellationToken);
        return medicine.Id;
    }
}

public class UpdateMedicineHandler : IRequestHandler<UpdateMedicineCommand, Unit>
{
    private readonly IApplicationDbContext _context;

    public UpdateMedicineHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(UpdateMedicineCommand request, CancellationToken cancellationToken)
    {
        var medicine = await _context.Medicines
            .FirstOrDefaultAsync(m => m.Id == request.Id, cancellationToken);
        if (medicine is null)
            throw new NotFoundException(nameof(Medicine), request.Id);

        var barcodeTaken = await _context.Medicines
            .AnyAsync(m => m.Barcode == request.Barcode && m.Id != request.Id, cancellationToken);
        if (barcodeTaken)
            throw new ConflictException($"A medicine with barcode '{request.Barcode}' already exists.");

        medicine.NameAr = request.NameAr;
        medicine.NameEn = request.NameEn;
        medicine.Barcode = request.Barcode;
        medicine.JFDARegistrationNo = request.JFDARegistrationNo;
        medicine.Form = request.Form;
        medicine.Strength = request.Strength;
        medicine.Manufacturer = request.Manufacturer;
        medicine.TaxRate = request.TaxRate;
        medicine.IsControlled = request.IsControlled;
        medicine.ControlledLevel = request.ControlledLevel;
        medicine.IsActive = request.IsActive;
        medicine.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

public class GetMedicinesHandler : IRequestHandler<GetMedicinesQuery, PagedResult<MedicineDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMedicinesHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<MedicineDto>> Handle(GetMedicinesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Medicines.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(m => m.NameAr.Contains(term) ||
                                     m.NameEn.Contains(term) ||
                                     m.Barcode.Contains(term));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(m => m.IsActive == request.IsActive.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(m => new MedicineDto(
                m.Id, m.NameAr, m.NameEn, m.Barcode, m.JFDARegistrationNo,
                m.Form, m.Strength, m.Manufacturer, m.TaxRate,
                m.IsControlled, m.ControlledLevel, m.IsActive, m.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<MedicineDto>(
            items, totalCount, request.Page, request.PageSize,
            (int)Math.Ceiling(totalCount / (double)request.PageSize)
        );
    }
}
