using MediatR;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Application.Features.Purchases;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PurchasesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchasesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Purchase orders, newest first, with supplier/status/date filters.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<PurchaseOrderListItemDto>>> GetOrders(
        [FromQuery] string? searchTerm = null,
        [FromQuery] int? supplierId = null,
        [FromQuery] PurchaseStatus? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPurchaseOrdersQuery(
            searchTerm, supplierId, status, fromDate, toDate, page, pageSize));
        return Ok(result);
    }

    /// <summary>Headline figures for the purchases dashboard cards.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<PurchasesSummaryDto>> GetSummary()
    {
        var result = await _mediator.Send(new GetPurchasesSummaryQuery());
        return Ok(result);
    }

    /// <summary>One order with its lines, for editing, receiving and reprinting.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PurchaseOrderDto>> GetOrder(int id)
    {
        var result = await _mediator.Send(new GetPurchaseOrderByIdQuery(id));
        return Ok(result);
    }

    /// <summary>Creates a draft order.</summary>
    [HttpPost]
    public async Task<ActionResult<PurchaseOrderDto>> CreateOrder([FromBody] CreatePurchaseOrderCommand command)
    {
        var order = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    /// <summary>Replaces a draft order's lines and details. The id in the body cannot disagree with the URL.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<PurchaseOrderDto>> UpdateOrder(
        int id, [FromBody] UpdatePurchaseOrderCommand command)
    {
        if (id != command.Id) return BadRequest();
        var order = await _mediator.Send(command);
        return Ok(order);
    }

    /// <summary>Confirms a draft with the supplier; the order can no longer be edited.</summary>
    [HttpPost("{id:int}/place")]
    public async Task<ActionResult<PurchaseOrderDto>> PlaceOrder(int id)
    {
        var order = await _mediator.Send(new PlacePurchaseOrderCommand(id));
        return Ok(order);
    }

    /// <summary>Cancels an order that was never (or only partly) delivered.</summary>
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<PurchaseOrderDto>> CancelOrder(
        int id, [FromBody] CancelOrderRequest request)
    {
        var order = await _mediator.Send(new CancelPurchaseOrderCommand(id, request.Reason));
        return Ok(order);
    }

    /// <summary>
    /// Receives part (or all) of an order into stock: creates the batches and
    /// records the receipt movements against the order number.
    /// </summary>
    [HttpPost("{id:int}/receive")]
    public async Task<ActionResult<PurchaseOrderDto>> ReceiveOrder(
        int id, [FromBody] ReceiveOrderRequest request)
    {
        var order = await _mediator.Send(new ReceivePurchaseOrderCommand(id, request.Lines));
        return Ok(order);
    }

    /// <summary>
    /// Body of a cancellation. The order id comes from the route, so it is
    /// deliberately absent here and cannot disagree with the URL.
    /// </summary>
    public record CancelOrderRequest(string Reason);

    /// <summary>
    /// Body of a receiving action. The order id comes from the route; only the
    /// lines actually arriving now are included.
    /// </summary>
    public record ReceiveOrderRequest(IReadOnlyList<ReceiveOrderLineRequest> Lines);
}