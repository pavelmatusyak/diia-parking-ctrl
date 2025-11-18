using System.Collections.Generic;

public class NearbyObject
{
    public string Kind { get; set; } = default!;   // "crossing", "bus_stop", "cycleway" etc.
    public double DistanceMeters { get; set; }
    public long OsmId { get; set; }
}

public class ViolationReason
{
    public string Code { get; set; } = default!;        // "15.9(г)", "cycleway", etc.
    public string Description { get; set; } = default!;
}

public class ParkingViolationResult
{
    public bool IsViolation { get; set; }
    public List<ViolationReason> Reasons { get; set; } = new();
    public List<NearbyObject> NearbyObjects { get; set; } = new();
}
