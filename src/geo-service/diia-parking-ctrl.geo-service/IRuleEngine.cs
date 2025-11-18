using System.Collections.Generic;
using System.Linq;

public interface IRuleEngine
{
    ParkingViolationResult Evaluate(IEnumerable<NearbyObject> objects);
}

public class RuleEngine : IRuleEngine
{
    public ParkingViolationResult Evaluate(IEnumerable<NearbyObject> objects)
    {
        var result = new ParkingViolationResult();
        var list = objects.ToList();
        result.NearbyObjects = list;

        // 15.9(г): пішохідний перехід та ближче 10 м
        var crossing = list
            .Where(o => o.Kind == "crossing" && o.DistanceMeters <= 10)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (crossing != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "15.9(г)",
                Description = $"Авто розташоване {crossing.DistanceMeters:F1} м від пішохідного переходу (менше 10 м)."
            });
        }

        // 15.9(е): ближче 30 м до зупинки громадського транспорту
        var busStop = list
            .Where(o => o.Kind == "bus_stop" && o.DistanceMeters <= 30)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (busStop != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "15.9(е)",
                Description = $"Авто розташоване {busStop.DistanceMeters:F1} м від зупинки громадського транспорту (менше 30 м)."
            });
        }

        // 15.9(и): ближче 10 м від виїзду з прилеглої території (service=driveway)
        var entrance = list
            .Where(o => o.Kind == "entrance" && o.DistanceMeters <= 10)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (entrance != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "15.9(и)",
                Description = $"Авто розташоване {entrance.DistanceMeters:F1} м від виїзду з прилеглої території (менше 10 м)."
            });
        }

        // 15.9(б): на трамвайних коліях (тут грубо: якщо в радіусі <= 3 м)
        var tram = list
            .Where(o => o.Kind == "tram_track" && o.DistanceMeters <= 3)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (tram != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "15.9(б)",
                Description = $"Автомобіль знаходиться на трамвайних коліях (відстань до осі колії {tram.DistanceMeters:F1} м)."
            });
        }

        // 15.9(в): мости/естакади/тунелі — якщо ми в радіусі 5 м від такого шляху
        var bridgeTunnel = list
            .Where(o => o.Kind == "bridge_or_tunnel" && o.DistanceMeters <= 5)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (bridgeTunnel != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "15.9(в)",
                Description = "Автомобіль знаходиться на мосту, естакаді або в тунелі, що заборонено для зупинки."
            });
        }

        // Велодоріжка: паркування прямо на cycleway (<=3 м)
        var cycleway = list
            .Where(o => o.Kind == "cycleway" && o.DistanceMeters <= 3)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (cycleway != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "bike_lane",
                Description = $"Авто знаходиться на або безпосередньо поруч з велодоріжкою/велосмугою (≈{cycleway.DistanceMeters:F1} м)."
            });
        }

        // Тротуар / пішохідна зона: не можна там паркувати
        var footway = list
            .Where(o => o.Kind == "footway_or_pedestrian" && o.DistanceMeters <= 3)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (footway != null)
        {
            result.IsViolation = true;
            result.Reasons.Add(new ViolationReason
            {
                Code = "sidewalk",
                Description = "Авто знаходиться на тротуарі або у пішохідній зоні, що заборонено (крім спеціальних випадків)."
            });
        }

        // Світлофори – поки просто інформаційно (можна винести в окреме правило)
        var signal = list
            .Where(o => o.Kind == "traffic_signals" && o.DistanceMeters <= 10)
            .OrderBy(o => o.DistanceMeters)
            .FirstOrDefault();

        if (signal != null)
        {
            result.Reasons.Add(new ViolationReason
            {
                Code = "traffic_signals_hint",
                Description = $"Світлофор розташований у {signal.DistanceMeters:F1} м. Варто перевірити, чи авто не закриває його."
            });
        }

        return result;
    }
}
