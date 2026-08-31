using Microsoft.EntityFrameworkCore;
using PharmacySystem.Domain.Entities;

namespace PharmacySystem.Application.Common;

/// <summary>
/// Abstraction over the persistence layer so that the Application layer
/// does not depend on Infrastructure (keeps Clean Architecture one-directional).
/// </summary>
public interface IApplicationDbContext
{
    DbSet<Medicine> Medicines { get; }
    DbSet<Batch> Batches { get; }
    DbSet<Pharmacy> Pharmacies { get; }
    DbSet<PharmacyBranch> PharmacyBranches { get; }
    DbSet<StockMovement> StockMovements { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
