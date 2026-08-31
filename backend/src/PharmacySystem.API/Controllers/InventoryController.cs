using MediatR;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Application.Features.Inventory;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IMediator _mediator;

    public InventoryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Stock position per medicine, aggregated across batches.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<InventoryItemDto>>> GetInventory(
        [FromQuery] string? searchTerm = null,
        [FromQuery] StockStatus? status = null,
        [FromQuery] bool? isControlled = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetInventoryQuery(searchTerm, status, isControlled, page, pageSize));
        return Ok(result);
    }

    /// <summary>Headline inventory figures for the dashboard cards.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<InventorySummaryDto>> GetSummary()
    {
        var result = await _mediator.Send(new GetInventorySummaryQuery());
        return Ok(result);
    }

    /// <summary>Individual batches, ordered first-expired-first-out.</summary>
    [HttpGet("batches")]
    public async Task<ActionResult<PagedResult<BatchDto>>> GetBatches(
        [FromQuery] int? medicineId = null,
        [FromQuery] string? searchTerm = null,
        [FromQuery] ExpiryStatus? expiryStatus = null,
        [FromQuery] bool includeDepleted = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetBatchesQuery(medicineId, searchTerm, expiryStatus, includeDepleted, page, pageSize));
        return Ok(result);
    }

    /// <summary>Audit trail of stock changes.</summary>
    [HttpGet("movements")]
    public async Task<ActionResult<PagedResult<StockMovementDto>>> GetMovements(
        [FromQuery] int? batchId = null,
        [FromQuery] int? medicineId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(
            new GetStockMovementsQuery(batchId, medicineId, page, pageSize));
        return Ok(result);
    }

    /// <summary>Records a goods receipt, creating a new batch.</summary>
    [HttpPost("batches")]
    public async Task<ActionResult<int>> ReceiveStock([FromBody] ReceiveStockCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetBatches), new { id }, id);
    }

    /// <summary>Corrects a batch quantity, recording an auditable movement.</summary>
    [HttpPut("batches/{id:int}/quantity")]
    public async Task<IActionResult> AdjustStock(int id, [FromBody] AdjustStockRequest request)
    {
        await _mediator.Send(new AdjustStockCommand(
            id, request.NewQuantity, request.MovementType, request.Reason, request.Reference));
        return NoContent();
    }

    /// <summary>
    /// Body of an adjustment. The batch id comes from the route, so it is
    /// deliberately absent here and cannot disagree with the URL.
    /// </summary>
    public record AdjustStockRequest(
        int NewQuantity,
        StockMovementType MovementType,
        string Reason,
        string? Reference = null
    );
}
