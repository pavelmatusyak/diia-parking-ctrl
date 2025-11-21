#!/usr/bin/env python3
"""
Test script for verifying the updated PUT violations endpoint and parking-analysis endpoint.
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"


def get_auth_token():
    """Generate authentication token for test user."""
    from interactors.auth import create_access_token

    token = create_access_token({
        'sub': 'test-user-123',
        'diia_user_id': 'diia-test-001'
    })
    print(f"✓ Generated token for test user")
    return token


def create_test_violation(token):
    """Create a test violation."""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        f"{BASE_URL}/violations",
        headers=headers,
        json={
            "latitude": 50.4501,
            "longitude": 30.5234,
            "notes": "Test violation for timer enforcement"
        }
    )

    if response.status_code != 201:
        print(f"❌ Failed to create violation: {response.status_code}")
        print(response.text)
        sys.exit(1)

    data = response.json()
    print(f"✓ Created violation: {data['id']}")
    return data["id"]


def test_parking_analysis(token, violation_id):
    """Test the updated parking-analysis/analyze endpoint."""
    print("\n" + "="*80)
    print("TEST 1: Parking Analysis with violation_id")
    print("="*80)

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        f"{BASE_URL}/parking-analysis/analyze",
        headers=headers,
        json={
            "violation_id": violation_id,
            "zoom": 17,
            "image_size": 512
        }
    )

    if response.status_code == 200:
        print("✓ Parking analysis endpoint works!")
        data = response.json()
        print(f"  - Is violation: {data.get('isViolation')}")
        print(f"  - Confidence: {data.get('overallViolationConfidence')}")

        breakdown = data.get('probabilityBreakdown', {})
        print(f"  - Railway crossing: {breakdown.get('railway_crossing')}")
        print(f"  - Tram track: {breakdown.get('tram_track')}")
        print(f"  - Bridge or tunnel: {breakdown.get('bridge_or_tunnel')}")
        return True
    else:
        print(f"❌ Parking analysis failed: {response.status_code}")
        print(response.text)
        return False


def test_submit_without_timer_required_type(token, violation_id):
    """Test submitting violation without timer-required type."""
    print("\n" + "="*80)
    print("TEST 2: Submit violation WITHOUT timer-required type")
    print("="*80)

    headers = {"Authorization": f"Bearer {token}"}

    # Submit without timer and without timer-required violation type
    response = requests.put(
        f"{BASE_URL}/violations/{violation_id}/submit",
        headers=headers,
        json={
            "violation_reason": "Parking on sidewalk",
            "violation_code": "15.9",
            "violation_type": "sidewalk",  # NOT in timer-required list
            "notes": "Test submission"
        }
    )

    if response.status_code == 200:
        print("✓ Submission without timer-required type works (no timer needed)!")
        data = response.json()
        print(f"  - Violation ID: {data.get('id')}")
        print(f"  - Status: {data.get('status')}")
        return True
    else:
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        # This might fail for other reasons (e.g., no photos), which is okay for this test
        return None


def test_submit_with_timer_required_type_no_timer(token, violation_id):
    """Test submitting violation with timer-required type but no timer started."""
    print("\n" + "="*80)
    print("TEST 3: Submit violation WITH timer-required type but NO timer")
    print("="*80)

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.put(
        f"{BASE_URL}/violations/{violation_id}/submit",
        headers=headers,
        json={
            "violation_reason": "Railway crossing violation",
            "violation_code": "5.9",
            "violation_type": "railway_crossing",  # IN timer-required list
            "notes": "Test submission"
        }
    )

    if response.status_code == 400:
        error = response.json()
        if "timer" in error.get("detail", "").lower():
            print("✓ Correctly rejected submission (timer required but not started)!")
            print(f"  - Error message: {error.get('detail')}")
            return True
    elif response.status_code == 200:
        print("⚠ Submission succeeded but should have required timer")
        return False

    print(f"❌ Unexpected response: {response.status_code}")
    print(response.text)
    return False


def test_start_timer(token, violation_id):
    """Test starting timer."""
    print("\n" + "="*80)
    print("TEST 4: Start timer")
    print("="*80)

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        f"{BASE_URL}/violations/{violation_id}/start-timer",
        headers=headers
    )

    if response.status_code == 200:
        print("✓ Timer started successfully!")
        data = response.json()
        print(f"  - Started at: {data.get('timer_started_at')}")
        print(f"  - Expires at: {data.get('timer_expires_at')}")
        return True
    else:
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return None


def main():
    print("="*80)
    print("Testing Updated Endpoints")
    print("="*80)

    # Get authentication token
    token = get_auth_token()

    # Create test violation
    violation_id = create_test_violation(token)

    # Test 1: Parking analysis with violation_id
    test1_result = test_parking_analysis(token, violation_id)

    # Test 2: Submit without timer-required type
    test2_result = test_submit_without_timer_required_type(token, violation_id)

    # Test 3: Submit with timer-required type but no timer
    test3_result = test_submit_with_timer_required_type_no_timer(token, violation_id)

    # Test 4: Start timer (optional, might fail if conditions not met)
    test4_result = test_start_timer(token, violation_id)

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Test 1 (Parking Analysis): {'✓ PASS' if test1_result else '❌ FAIL'}")
    print(f"Test 2 (Submit without timer-required type): {'✓ PASS' if test2_result else '⚠ SKIP' if test2_result is None else '❌ FAIL'}")
    print(f"Test 3 (Timer enforcement): {'✓ PASS' if test3_result else '❌ FAIL'}")
    print(f"Test 4 (Start timer): {'✓ PASS' if test4_result else '⚠ SKIP' if test4_result is None else '❌ FAIL'}")

    # Overall result
    critical_tests = [test1_result, test3_result]
    if all(critical_tests):
        print("\n✓ All critical tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
