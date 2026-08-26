namespace PharmacySystem.Domain.Entities;

public class Pharmacy
{
    public int Id { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string LicenseNo { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    
    public virtual ICollection<PharmacyBranch> Branches { get; set; } = new List<PharmacyBranch>();
}
