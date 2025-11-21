using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

builder.Services.AddHttpClient<IOsmOverpassClient, OsmOverpassClient>();
builder.Services.AddHttpClient("osmTiles", client =>
{
    client.BaseAddress = new Uri("https://tile.openstreetmap.org/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("diia-parking-ctrl.geo-service/1.0");
});

builder.Services.AddScoped<IRuleEngine, RuleEngine>();
builder.Services.AddScoped<IParkingViolationService, ParkingViolationService>();
builder.Services.AddSingleton<IMapRenderingService, OsmTileMapRenderingService>();

var app = builder.Build();


app.UseSwagger();
app.UseSwaggerUI();


app.MapHealthChecks("/health");

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

app.MapGet("/api/map", async (
    double lat,
    double lon,
    int zoom,
    int imageSize,
    IMapRenderingService renderer,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    const int minZoom = 0;
    const int maxZoom = 19;
    const int minImageSize = 128;
    const int maxImageSize = 2048;

    if (zoom < minZoom || zoom > maxZoom)
    {
        return Results.BadRequest($"zoom must be between {minZoom} and {maxZoom}.");
    }

    if (imageSize < minImageSize || imageSize > maxImageSize)
    {
        return Results.BadRequest($"imageSize must be between {minImageSize} and {maxImageSize} pixels.");
    }

    logger.LogInformation("Rendering map lat={Lat}, lon={Lon}, zoom={Zoom}, size={Size}", lat, lon, zoom, imageSize);
    var buffer = await renderer.RenderAsync(lat, lon, zoom, imageSize, cancellationToken);
    var fileName = FormattableString.Invariant($"map_z{zoom}_{lat:F4}_{lon:F4}.png");
    return Results.File(buffer, "image/png", fileName);
});



app.Run();

