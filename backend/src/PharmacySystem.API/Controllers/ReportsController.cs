using MediatR;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Application.Features.Reports;

namespace PharmacySystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Consolidated sales, purchasing and inventory report for a date range.
    /// Defaults to the last 30 calendar days.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ReportsDashboardDto>> GetDashboard(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _mediator.Send(new GetReportsDashboardQuery(fromDate, toDate));
        return Ok(result);
    }
}