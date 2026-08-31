using MediatR;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Application.Features.Medicines;
using PharmacySystem.Application.Features.Sales;
using PharmacySystem.Domain.Enums;

namespace PharmacySystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SalesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Products the till can sell, with current price and sellable quantity.
    /// Expired stock is excluded from the availability figure.
    /// </summary>
    [HttpGet("products")]
    public async Task<ActionResult<PagedResult<SellableProductDto>>> GetProducts(
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool inStockOnly = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(
            new GetSellableProductsQuery(searchTerm, inStockOnly, page, pageSize));
        return Ok(result);
    }

    /// <summary>Invoice history, newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<SaleListItemDto>>> GetSales(
        [FromQuery] string? searchTerm = null,
        [FromQuery] SaleStatus? status = null,
        [FromQuery] PaymentMethod? paymentMethod = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetSalesQuery(searchTerm, status, paymentMethod, fromDate, toDate, page, pageSize));
        return Ok(result);
    }

    /// <summary>Takings for a single day. Defaults to today.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<SalesSummaryDto>> GetSummary([FromQuery] DateTime? date = null)
    {
        var result = await _mediator.Send(new GetSalesSummaryQuery(date));
        return Ok(result);
    }

    /// <summary>One invoice with its lines, for reprinting a receipt.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<SaleDto>> GetSale(int id)
    {
        var result = await _mediator.Send(new GetSaleByIdQuery(id));
        return Ok(result);
    }

    /// <summary>
    /// Rings up a sale. Prices, tax and totals are computed server-side from the
    /// stored batch prices; the request only names the medicines and quantities.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SaleDto>> CreateSale([FromBody] CreateSaleCommand command)
    {
        var sale = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetSale), new { id = sale.Id }, sale);
    }

    /// <summary>Reverses a sale, returning every unit to the batch it came from.</summary>
    [HttpPost("{id:int}/return")]
    public async Task<ActionResult<SaleDto>> ReturnSale(int id, [FromBody] ReturnSaleRequest request)
    {
        var sale = await _mediator.Send(new ReturnSaleCommand(id, request.Reason));
        return Ok(sale);
    }

    /// <summary>
    /// Body of a return. The invoice id comes from the route, so it is deliberately
    /// absent here and cannot disagree with the URL.
    /// </summary>
    public record ReturnSaleRequest(string Reason);
}
