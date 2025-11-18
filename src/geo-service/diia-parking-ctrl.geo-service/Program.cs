using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// HttpClient ??? Overpass
builder.Services.AddHttpClient<IOsmOverpassClient, OsmOverpassClient>();

// Rule Engine + ??????
builder.Services.AddScoped<IRuleEngine, RuleEngine>();
builder.Services.AddScoped<IParkingViolationService, ParkingViolationService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/check", async (
    double lat,
    double lon,
    IParkingViolationService service,
    ILogger<Program> logger) =>
{
    logger.LogInformation("Checking parking at {Lat}, {Lon}", lat, lon);

    var result = await service.AnalyzeAsync(lat, lon);

    return Results.Ok(result);
});



app.Run();

