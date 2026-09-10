using MediatR;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Application.Features.Suppliers;

namespace PharmacySystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly IMediator _mediator;

    public SuppliersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Supplier master data; used by the buying screens as a pick list.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<SupplierDto>>> GetSuppliers(
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetSuppliersQuery(searchTerm, isActive, page, pageSize));
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<int>> CreateSupplier([FromBody] CreateSupplierCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetSuppliers), new { id }, id);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateSupplier(int id, [FromBody] UpdateSupplierCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }
}