using Microsoft.AspNetCore.Mvc;
using MediatR;
using PharmacySystem.Application.Features.Medicines;

namespace PharmacySystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MedicinesController : ControllerBase
{
    private readonly IMediator _mediator;

    public MedicinesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<MedicineDto>>> GetMedicines(
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = new GetMedicinesQuery(searchTerm, isActive, page, pageSize);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<int>> CreateMedicine([FromBody] CreateMedicineCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetMedicines), new { id }, id);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMedicine(int id, [FromBody] UpdateMedicineCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }
}
