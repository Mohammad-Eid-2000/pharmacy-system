using System.Net;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Application.Common;

namespace PharmacySystem.API.Middleware;

/// <summary>
/// Translates application exceptions into RFC 7807 ProblemDetails responses
/// so clients get meaningful status codes instead of a bare HTTP 500.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var (status, title) = ex switch
            {
                NotFoundException => (HttpStatusCode.NotFound, "Resource not found"),
                ConflictException => (HttpStatusCode.Conflict, "Conflict"),
                _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred")
            };

            if (status == HttpStatusCode.InternalServerError)
                _logger.LogError(ex, "Unhandled exception on {Path}", context.Request.Path);
            else
                _logger.LogWarning("{Title} on {Path}: {Message}", title, context.Request.Path, ex.Message);

            var problem = new ProblemDetails
            {
                Status = (int)status,
                Title = title,
                Detail = status == HttpStatusCode.InternalServerError ? null : ex.Message,
                Instance = context.Request.Path
            };

            context.Response.Clear();
            context.Response.StatusCode = (int)status;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(problem);
        }
    }
}
