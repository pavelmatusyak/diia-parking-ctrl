using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

public interface IOsmOverpassClient
{
    Task<List<NearbyObject>> GetNearbyObjectsAsync(double lat, double lon);
}

public class OsmOverpassClient : IOsmOverpassClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OsmOverpassClient> _logger;

    public OsmOverpassClient(HttpClient httpClient, ILogger<OsmOverpassClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<List<NearbyObject>> GetNearbyObjectsAsync(double lat, double lon)
    {
        var query = BuildOverpassQuery(lat, lon);

        var url = "https://overpass-api.de/api/interpreter?data=" +
                  Uri.EscapeDataString(query);

        _logger.LogInformation("Overpass query URL: {Url}", url);

        using var resp = await _httpClient.GetAsync(url);
        var payload = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogError("Overpass API error: {Status}. Body: {Body}", resp.StatusCode, payload);
            throw new Exception($"Overpass API error: {resp.StatusCode}");
        }

        var json = payload;
        _logger.LogDebug("Overpass raw response: {Json}", json);

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var data = JsonSerializer.Deserialize<OverpassResponse>(json, options);
        var result = new List<NearbyObject>();

        if (data?.Elements == null)
            return result;

        foreach (var el in data.Elements)
        {
            // ?????????? ?????????? ????????
            double? objLat = el.Lat;
            double? objLon = el.Lon;

            if ((!objLat.HasValue || !objLon.HasValue) && el.Center != null)
            {
                objLat = el.Center.Lat;
                objLon = el.Center.Lon;
            }

            if (!objLat.HasValue || !objLon.HasValue)
                continue;

            var distance = HaversineDistance(lat, lon, objLat.Value, objLon.Value);

            var kind = ClassifyElementKind(el.Tags);
            if (kind == null)
                continue;

            result.Add(new NearbyObject
            {
                Kind = kind,
                DistanceMeters = distance,
                OsmId = el.Id
            });
        }

        return result;
    }

    private static string BuildOverpassQuery(double lat, double lon)
    {
        // ?????? ?????: out center; ??? way ??? center.lat/lon
        return FormattableString.Invariant($@"
[out:json][timeout:25];
(
  // ?????????? ???????
  node(around:10,{lat},{lon})[highway=crossing];

  // ??????? ???????????? ??????????
  node(around:30,{lat},{lon})[highway=bus_stop];

  // ??????????
  node(around:20,{lat},{lon})[highway=traffic_signals];

  // ????????? ????? (way)
  way(around:10,{lat},{lon})[railway=tram];

  // ??????????? ???????
  node(around:10,{lat},{lon})[railway=level_crossing];

  // ??????????? / ?????????
  way(around:20,{lat},{lon})[highway=cycleway];
  way(around:20,{lat},{lon})[highway=path][bicycle=designated];
  way(around:20,{lat},{lon})[highway=track][bicycle=designated];
  way(around:20,{lat},{lon})[cycleway=lane];
  way(around:20,{lat},{lon})[""cycleway:left""=lane];
  way(around:20,{lat},{lon})[""cycleway:right""=lane];

  // ?????????? / ????????? ???? / footway
  way(around:10,{lat},{lon})[highway=footway];
  way(around:10,{lat},{lon})[highway=pedestrian];
  way(around:10,{lat},{lon})[highway=path][foot=designated];

  // ?????? ? ??????: service=driveway
  way(around:20,{lat},{lon})[highway=service][service=driveway];

  // ????? / ??????
  way(around:10,{lat},{lon})[bridge=yes];
  way(around:10,{lat},{lon})[tunnel=yes];
);
out body center;
");
    }

    private static string? ClassifyElementKind(Dictionary<string, string>? tags)
    {
        if (tags == null) return null;

        if (tags.TryGetValue("highway", out var highway))
        {
            switch (highway)
            {
                case "crossing":
                    return "crossing";
                case "bus_stop":
                    return "bus_stop";
                case "traffic_signals":
                    return "traffic_signals";
                case "cycleway":
                    return "cycleway";
                case "footway":
                case "pedestrian":
                    return "footway_or_pedestrian";
                case "path":
                    if (tags.TryGetValue("bicycle", out var bicycle) && bicycle == "designated")
                        return "cycleway";
                    if (tags.TryGetValue("foot", out var foot) && foot == "designated")
                        return "footway_or_pedestrian";
                    break;
                case "track":
                    if (tags.TryGetValue("bicycle", out var bicycle2) && bicycle2 == "designated")
                        return "cycleway";
                    break;
                case "service":
                    if (tags.TryGetValue("service", out var service) && service == "driveway")
                        return "entrance";
                    break;
            }
        }

        if (tags.TryGetValue("railway", out var railway))
        {
            if (railway == "tram")
                return "tram_track";
            if (railway == "level_crossing")
                return "railway_crossing";
        }

        if (tags.TryGetValue("bridge", out var bridge) && bridge == "yes")
            return "bridge_or_tunnel";

        if (tags.TryGetValue("tunnel", out var tunnel) && tunnel == "yes")
            return "bridge_or_tunnel";

        if (tags.TryGetValue("cycleway", out var cycleway) && cycleway == "lane")
            return "cycleway";
        if (tags.TryGetValue("cycleway:left", out var cLeft) && cLeft == "lane")
            return "cycleway";
        if (tags.TryGetValue("cycleway:right", out var cRight) && cRight == "lane")
            return "cycleway";

        return null;
    }

    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // radius Earth in meters
        double dLat = ToRad(lat2 - lat1);
        double dLon = ToRad(lon2 - lon1);
        double a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;
}

// DTO ??? ?????????????? Overpass ?????????
public class OverpassResponse
{
    [JsonPropertyName("elements")]
    public List<OverpassElement>? Elements { get; set; }
}

public class OverpassElement
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = default!;

    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("lat")]
    public double? Lat { get; set; }

    [JsonPropertyName("lon")]
    public double? Lon { get; set; }

    [JsonPropertyName("center")]
    public OverpassCenter? Center { get; set; }

    [JsonPropertyName("tags")]
    public Dictionary<string, string>? Tags { get; set; }
}

public class OverpassCenter
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }
}



