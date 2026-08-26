namespace PharmacySystem.Domain.Entities;

public class PharmacyBranch
{
    public int Id { get; set; }
    public int PharmacyId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string BranchCode { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsMain { get; set; }
    public bool IsActive { get; set; } = true;
    
    public virtual Pharmacy Pharmacy { get; set; } = null!;
}
