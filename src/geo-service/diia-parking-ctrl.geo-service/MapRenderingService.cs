using System;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

public interface IMapRenderingService
{
    Task<byte[]> RenderAsync(double latitude, double longitude, int zoom, int imageSize, CancellationToken cancellationToken = default);
}

public class OsmTileMapRenderingService : IMapRenderingService
{
    private const int TileSize = 256;
    private const double MaxLatitude = 85.05112878;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OsmTileMapRenderingService> _logger;
    private readonly string _cacheDirectory;
    private readonly bool _cacheEnabled;

    public OsmTileMapRenderingService(IHttpClientFactory httpClientFactory, ILogger<OsmTileMapRenderingService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        _cacheDirectory = Path.Combine(AppContext.BaseDirectory, "tile-cache");
        try
        {
            Directory.CreateDirectory(_cacheDirectory);
            _cacheEnabled = true;
        }
        catch (Exception ex)
        {
            _cacheEnabled = false;
            _logger.LogWarning(ex, "Tile caching disabled because directory {Directory} cannot be created.", _cacheDirectory);
        }
    }

    public async Task<byte[]> RenderAsync(double latitude, double longitude, int zoom, int imageSize, CancellationToken cancellationToken = default)
    {
        if (imageSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(imageSize), "Image size must be positive.");
        }

        latitude = Math.Clamp(latitude, -MaxLatitude, MaxLatitude);
        longitude = NormalizeLongitude(longitude);

        var tilesPerAxis = 1 << zoom;
        var worldSize = TileSize * tilesPerAxis;

        var latRad = latitude * Math.PI / 180.0;
        var centerX = (longitude + 180.0) / 360.0 * worldSize;
        var centerY = (1 - Math.Log(Math.Tan(latRad) + Sec(latRad)) / Math.PI) / 2 * worldSize;

        var halfSize = imageSize / 2.0;
        var topLeftX = centerX - halfSize;
        var topLeftY = centerY - halfSize;

        var maxTopLeftY = Math.Max(0, worldSize - imageSize);
        topLeftY = Math.Clamp(topLeftY, 0, maxTopLeftY);

        var bottomRightX = topLeftX + imageSize - 1;
        var bottomRightY = topLeftY + imageSize - 1;

        var startTileX = (int)Math.Floor(topLeftX / TileSize);
        var startTileY = (int)Math.Floor(topLeftY / TileSize);
        var endTileX = (int)Math.Floor(bottomRightX / TileSize);
        var endTileY = (int)Math.Floor(bottomRightY / TileSize);

        var tileCountX = endTileX - startTileX + 1;
        var tileCountY = endTileY - startTileY + 1;

        using var output = new Image<Rgba32>(imageSize, imageSize);

        for (var tileOffsetY = 0; tileOffsetY < tileCountY; tileOffsetY++)
        {
            var tileYIndex = startTileY + tileOffsetY;
            var fetchTileY = Math.Clamp(tileYIndex, 0, tilesPerAxis - 1);

            for (var tileOffsetX = 0; tileOffsetX < tileCountX; tileOffsetX++)
            {
                var tileXIndex = startTileX + tileOffsetX;
                var wrappedTileX = WrapTile(tileXIndex, tilesPerAxis);

                var targetX = (int)Math.Round(tileXIndex * TileSize - topLeftX);
                var targetY = (int)Math.Round(tileYIndex * TileSize - topLeftY);

                try
                {
                    using var tile = await GetTileAsync(zoom, wrappedTileX, fetchTileY, cancellationToken);
                    output.Mutate(ctx => ctx.DrawImage(tile, new Point(targetX, targetY), 1f));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to place tile z{Zoom}/{X}/{Y}. Filling with transparent pixels.", zoom, wrappedTileX, fetchTileY);
                }
            }
        }

        var markerX = (int)Math.Round(centerX - topLeftX);
        var markerY = (int)Math.Round(centerY - topLeftY);
        DrawMarker(output, markerX, markerY);

        await using var ms = new MemoryStream();
        await output.SaveAsPngAsync(ms, cancellationToken);
        return ms.ToArray();
    }

    private async Task<Image<Rgba32>> GetTileAsync(int zoom, int tileX, int tileY, CancellationToken cancellationToken)
    {
        var fileName = Path.Combine(_cacheDirectory, $"{zoom}_{tileX}_{tileY}.png");
        if (_cacheEnabled && File.Exists(fileName))
        {
            await using var cachedStream = File.OpenRead(fileName);
            return await Image.LoadAsync<Rgba32>(cachedStream, cancellationToken);
        }

        var client = _httpClientFactory.CreateClient("osmTiles");
        var url = $"{zoom}/{tileX}/{tileY}.png";
        using var response = await client.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var downloadStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var buffer = new MemoryStream();
        await downloadStream.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();

        if (_cacheEnabled)
        {
            try
            {
                await File.WriteAllBytesAsync(fileName, bytes, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cache tile {Path}", fileName);
            }
        }

        return Image.Load<Rgba32>(bytes);
    }

    private static void DrawMarker(Image<Rgba32> image, int x, int y)
    {
        var radius = Math.Max(6, image.Width / 50);
        var outerRadius = radius + 2;
        DrawSolidCircle(image, x, y, outerRadius, new Rgba32(255, 255, 255, 255));
        DrawSolidCircle(image, x, y, radius, new Rgba32(220, 53, 69, 255));
    }

    private static void DrawSolidCircle(Image<Rgba32> image, int centerX, int centerY, int radius, Rgba32 color)
    {
        var radiusSquared = radius * radius;
        for (var offsetY = -radius; offsetY <= radius; offsetY++)
        {
            var targetY = centerY + offsetY;
            if (targetY < 0 || targetY >= image.Height)
            {
                continue;
            }

            for (var offsetX = -radius; offsetX <= radius; offsetX++)
            {
                var targetX = centerX + offsetX;
                if (targetX < 0 || targetX >= image.Width)
                {
                    continue;
                }

                if (offsetX * offsetX + offsetY * offsetY <= radiusSquared)
                {
                    image[targetX, targetY] = color;
                }
            }
        }
    }

    private static int WrapTile(int tileX, int tilesPerAxis)
    {
        var result = tileX % tilesPerAxis;
        return result < 0 ? result + tilesPerAxis : result;
    }

    private static double NormalizeLongitude(double longitude)
    {
        var lon = longitude % 360.0;
        if (lon < -180)
        {
            lon += 360;
        }
        else if (lon > 180)
        {
            lon -= 360;
        }

        return lon;
    }

    private static double Sec(double angle) => 1.0 / Math.Cos(angle);
}
