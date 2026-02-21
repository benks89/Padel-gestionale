#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class SportCenterAPITester:
    def __init__(self, base_url="https://sport-center-reserve.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token and not headers:
            test_headers['Authorization'] = f'Bearer {self.token}'
        elif headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"text": response.text}

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.test_results.append({"test": name, "status": "PASS", "details": response_data})
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response_data}")
                self.test_results.append({"test": name, "status": "FAIL", "expected": expected_status, "actual": response.status_code, "details": response_data})

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({"test": name, "status": "ERROR", "error": str(e)})
            return False, {}

    def test_register_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "test123",
            "nome": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True, user_data
        return False, user_data

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@sportcenter.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_user_login(self, user_data):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": user_data["email"], "password": user_data["password"]}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, _ = self.run_test("Get User Info", "GET", "auth/me", 200)
        return success

    def test_get_courts(self):
        """Test get courts"""
        success, response = self.run_test("Get Courts", "GET", "courts", 200)
        if success:
            print(f"Found {len(response)} courts")
            return True, response
        return False, []

    def test_get_availability(self, court_id):
        """Test get availability for a court"""
        today = datetime.now().strftime('%Y-%m-%d')
        success, response = self.run_test(
            "Get Court Availability",
            "GET",
            "bookings/availability",
            200,
            data={"court_id": court_id, "data": today}
        )
        
        if success:
            print(f"Found {len(response.get('slots', []))} time slots")
            return True, response
        return False, {}

    def test_create_booking(self, court_id):
        """Test create booking"""
        today = datetime.now().strftime('%Y-%m-%d')
        booking_data = {
            "court_id": court_id,
            "data": today,
            "ora_inizio": "10:00"
        }
        
        success, response = self.run_test(
            "Create Booking",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        return response.get('id') if success else None

    def test_get_my_bookings(self):
        """Test get user's bookings"""
        success, response = self.run_test("Get My Bookings", "GET", "bookings/my", 200)
        if success:
            print(f"Found {len(response)} user bookings")
        return success

    def test_admin_get_all_bookings(self):
        """Test admin get all bookings"""
        # Temporarily set admin token
        old_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Admin Get All Bookings", "GET", "bookings", 200)
        if success:
            print(f"Admin found {len(response)} total bookings")
        
        # Restore user token
        self.token = old_token
        return success

    def test_delete_booking(self, booking_id):
        """Test delete booking"""
        if not booking_id:
            return False
            
        success, _ = self.run_test("Delete Booking", "DELETE", f"bookings/{booking_id}", 200)
        return success

def main():
    print("🚀 Starting SportCenter API Tests")
    tester = SportCenterAPITester()
    
    # Test 1: User Registration
    registration_success, user_data = tester.test_register_user()
    if not registration_success:
        print("❌ Registration failed, stopping user tests")
        return 1

    # Test 2: Admin Login
    admin_login_success = tester.test_admin_login()
    if not admin_login_success:
        print("❌ Admin login failed")

    # Test 3: User Login
    login_success = tester.test_user_login(user_data)
    if not login_success:
        print("❌ User login failed")
        return 1

    # Test 4: Get User Info
    tester.test_get_me()

    # Test 5: Get Courts
    courts_success, courts_data = tester.test_get_courts()
    if not courts_success:
        print("❌ Courts retrieval failed")
        return 1

    # Test 6: Get Availability
    if courts_data:
        first_court = courts_data[0]
        tester.test_get_availability(first_court['id'])

    # Test 7: Create Booking
    booking_id = None
    if courts_data:
        booking_id = tester.test_create_booking(first_court['id'])

    # Test 8: Get My Bookings
    tester.test_get_my_bookings()

    # Test 9: Admin Get All Bookings
    if admin_login_success:
        tester.test_admin_get_all_bookings()

    # Test 10: Delete Booking
    if booking_id:
        tester.test_delete_booking(booking_id)

    # Print final results
    print(f"\n📊 API Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Save detailed results
    with open('/app/test_results_backend.json', 'w') as f:
        json.dump({
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": f"{(tester.tests_passed/tester.tests_run)*100:.1f}%",
            "detailed_results": tester.test_results
        }, f, indent=2)

    return 0 if tester.tests_passed >= tester.tests_run * 0.8 else 1

if __name__ == "__main__":
    sys.exit(main())