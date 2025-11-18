using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

public interface IParkingViolationService
{
    Task<ParkingViolationResult> AnalyzeAsync(double lat, double lon);
}

public class ParkingViolationService : IParkingViolationService
{
    private readonly IOsmOverpassClient _osmClient;
    private readonly IRuleEngine _ruleEngine;
    private readonly ILogger<ParkingViolationService> _logger;

    public ParkingViolationService(
        IOsmOverpassClient osmClient,
        IRuleEngine ruleEngine,
        ILogger<ParkingViolationService> logger)
    {
        _osmClient = osmClient;
        _ruleEngine = ruleEngine;
        _logger = logger;
    }

    public async Task<ParkingViolationResult> AnalyzeAsync(double lat, double lon)
    {
        _logger.LogInformation("AnalyzeAsync started for {Lat}, {Lon}", lat, lon);

        var nearby = await _osmClient.GetNearbyObjectsAsync(lat, lon);
        _logger.LogInformation("Found {Count} OSM objects nearby", nearby.Count);

        var result = _ruleEngine.Evaluate(nearby);

        _logger.LogInformation("Violation: {Violation}, Reasons: {ReasonsCount}",
            result.IsViolation, result.Reasons.Count);

        return result;
    }
}
