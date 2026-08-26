namespace PharmacySystem.Application.Common;

/// <summary>Thrown when a requested entity does not exist. Maps to HTTP 404.</summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }

    public NotFoundException(string entity, object key)
        : base($"{entity} with key '{key}' was not found.") { }
}

/// <summary>Thrown when a request violates a uniqueness/business rule. Maps to HTTP 409.</summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}
