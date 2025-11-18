import asyncio
import json
from interactors.parking_analysis import ParkingAnalysisInteractor


async def test_analysis():
    interactor = ParkingAnalysisInteractor()

    test_photo_url = "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d"

    latitude = 50.4501
    longitude = 30.5234

    print(f"Testing parking analysis for coordinates: {latitude}, {longitude}")
    print(f"Photo URL: {test_photo_url}")
    print("\nFetching data from geo-service and analyzing with OpenAI...")

    try:
        result = await interactor.analyze_parking(
            latitude=latitude,
            longitude=longitude,
            photo_url=test_photo_url,
            zoom=17,
            image_size=512
        )

        print("\n" + "="*80)
        print("ANALYSIS RESULT:")
        print("="*80)
        print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_analysis())
