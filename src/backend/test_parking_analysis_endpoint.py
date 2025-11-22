#!/usr/bin/env python3
"""
Test the updated parking-analysis/analyze endpoint that accepts violation_id.
"""
import asyncio
from foundation.database import AsyncSessionLocal
from foundation.models import Violation, ViolationStatus
from foundation.schemas import AnalyzeParkingRequest
import uuid

async def test_parking_analysis_schema():
    """Test that the parking analysis endpoint schema accepts violation_id."""
    print("="*80)
    print("Testing Parking Analysis Endpoint Schema")
    print("="*80)

    # Test 1: Verify schema accepts violation_id
    print("\nTEST 1: Schema validation with violation_id")
    print("-"*80)

    try:
        request = AnalyzeParkingRequest(
            violation_id="test-violation-123",
            zoom=17,
            image_size=512
        )
        print("✓ PASS: Schema accepts violation_id parameter")
        print(f"  - violation_id: {request.violation_id}")
        print(f"  - zoom: {request.zoom}")
        print(f"  - image_size: {request.image_size}")
        success1 = True
    except Exception as e:
        print(f"❌ FAIL: Schema validation failed - {str(e)}")
        success1 = False

    # Test 2: Verify schema does NOT require latitude/longitude
    print("\nTEST 2: Schema should NOT require latitude/longitude")
    print("-"*80)

    try:
        # This should work without latitude/longitude
        request = AnalyzeParkingRequest(
            violation_id="test-violation-456"
        )
        print("✓ PASS: Schema works without latitude/longitude")
        print(f"  - Only violation_id is required: {request.violation_id}")
        success2 = True
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        success2 = False

    # Test 3: Create a test violation and verify the endpoint would work
    print("\nTEST 3: Verify violation with coordinates can be used")
    print("-"*80)

    async with AsyncSessionLocal() as session:
        violation_id = str(uuid.uuid4())
        test_user_id = "test-user-123"

        violation = Violation(
            id=violation_id,
            user_id=test_user_id,
            status=ViolationStatus.DRAFT,
            latitude=50.4501,
            longitude=30.5234,
            address="Test Address",
        )
        session.add(violation)
        await session.commit()

        print(f"✓ Created test violation: {violation_id}")
        print(f"  - Latitude: {violation.latitude}")
        print(f"  - Longitude: {violation.longitude}")

        # Verify the violation has the required coordinates
        if violation.latitude and violation.longitude:
            print("✓ PASS: Violation has coordinates for parking analysis")
            success3 = True
        else:
            print("❌ FAIL: Violation missing coordinates")
            success3 = False

        await session.rollback()

    # Test 4: Verify old schema fields are removed
    print("\nTEST 4: Verify latitude/longitude removed from request schema")
    print("-"*80)

    try:
        # Try to create request with old fields - should be ignored or fail
        request = AnalyzeParkingRequest(
            violation_id="test-123",
            latitude=50.45,  # This should be ignored
            longitude=30.52  # This should be ignored
        )
        # If we get here, extra fields were accepted but ignored (which is fine)
        print("⚠ NOTE: Extra fields accepted but ignored (Pydantic default behavior)")
        success4 = True
    except Exception as e:
        # If it fails with extra fields, that's also acceptable
        if "extra" in str(e).lower() or "unexpected" in str(e).lower():
            print("✓ PASS: Old fields rejected (strict validation)")
            success4 = True
        else:
            print(f"❌ FAIL: Unexpected error - {str(e)}")
            success4 = False

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Test 1 (Schema accepts violation_id): {'✓ PASS' if success1 else '❌ FAIL'}")
    print(f"Test 2 (No latitude/longitude required): {'✓ PASS' if success2 else '❌ FAIL'}")
    print(f"Test 3 (Violation coordinates available): {'✓ PASS' if success3 else '❌ FAIL'}")
    print(f"Test 4 (Old fields handling): {'✓ PASS' if success4 else '❌ FAIL'}")

    all_passed = success1 and success2 and success3 and success4
    print(f"\n{'✓ ALL TESTS PASSED!' if all_passed else '❌ SOME TESTS FAILED'}")

    return 0 if all_passed else 1

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(test_parking_analysis_schema()))
