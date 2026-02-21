"""
Test suite for booking duration customization feature
Tests admin booking creation and update with customizable durations (30, 60, 90, 120, 150, 180 minutes)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@sportcenter.com"
ADMIN_PASSWORD = "admin123"

# Test date - using future date (Feb 2026)
TEST_DATE = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')


class TestBookingDurationFeature:
    """Test customizable booking duration for admin bookings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.admin_token = token
            self.admin_user = login_response.json().get("user")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        yield
        
        # Cleanup: Delete test bookings created during tests
        try:
            bookings_response = self.session.get(f"{BASE_URL}/api/bookings")
            if bookings_response.status_code == 200:
                for booking in bookings_response.json():
                    if booking.get("user_email", "").startswith("test_duration_"):
                        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
        except:
            pass
    
    def test_admin_login_returns_admin_role(self):
        """Verify admin login works and returns admin role"""
        assert self.admin_user is not None
        assert self.admin_user.get("role") == "admin"
        print(f"✓ Admin login successful: {self.admin_user.get('email')}")
    
    def test_get_courts_returns_padel_and_calcio(self):
        """Verify courts are available including padel courts"""
        response = self.session.get(f"{BASE_URL}/api/courts")
        assert response.status_code == 200
        
        courts = response.json()
        assert len(courts) >= 5  # 4 padel + 1 calcio
        
        padel_courts = [c for c in courts if c["tipo"] == "padel"]
        assert len(padel_courts) == 4
        
        print(f"✓ Found {len(courts)} courts, {len(padel_courts)} padel courts")
    
    def test_admin_create_booking_with_30min_duration(self):
        """Test admin booking creation with 30 minute duration"""
        # First create a test user
        test_email = f"test_duration_30@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User 30min"
            })
        except:
            pass
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel1",
                "data": TEST_DATE,
                "ora_inizio": "08:00",
                "durata": 30
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "08:00"
        assert booking["ora_fine"] == "08:30"  # 30 min later
        assert booking["court_id"] == "padel1"
        
        print(f"✓ Created 30min booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_admin_create_booking_with_60min_duration(self):
        """Test admin booking creation with 1 hour duration"""
        test_email = f"test_duration_60@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User 60min"
            })
        except:
            pass
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel2",
                "data": TEST_DATE,
                "ora_inizio": "09:00",
                "durata": 60
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "09:00"
        assert booking["ora_fine"] == "10:00"  # 1 hour later
        
        print(f"✓ Created 60min booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_admin_create_booking_with_90min_duration(self):
        """Test admin booking creation with 1h30min duration (default)"""
        test_email = f"test_duration_90@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User 90min"
            })
        except:
            pass
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel3",
                "data": TEST_DATE,
                "ora_inizio": "10:00",
                "durata": 90
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "10:00"
        assert booking["ora_fine"] == "11:30"  # 1h30 later
        
        print(f"✓ Created 90min booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_admin_create_booking_with_120min_duration(self):
        """Test admin booking creation with 2 hour duration"""
        test_email = f"test_duration_120@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User 120min"
            })
        except:
            pass
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel4",
                "data": TEST_DATE,
                "ora_inizio": "12:00",
                "durata": 120
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "12:00"
        assert booking["ora_fine"] == "14:00"  # 2 hours later
        
        print(f"✓ Created 120min booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_admin_create_booking_with_150min_duration(self):
        """Test admin booking creation with 2h30min duration"""
        test_email = f"test_duration_150@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User 150min"
            })
        except:
            pass
        
        # Use a less likely to conflict time slot
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel1",
                "data": TEST_DATE,
                "ora_inizio": "07:30",  # Early morning, less likely conflict
                "durata": 150
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "07:30"
        assert booking["ora_fine"] == "10:00"  # 2h30 later (7:30 + 150min = 10:00)
        
        print(f"✓ Created 150min booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_admin_create_booking_with_180min_duration(self):
        """Test admin booking creation with 3 hour duration"""
        test_email = f"test_duration_180@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User 180min"
            })
        except:
            pass
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel2",
                "data": TEST_DATE,
                "ora_inizio": "17:00",
                "durata": 180
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "17:00"
        assert booking["ora_fine"] == "20:00"  # 3 hours later
        
        print(f"✓ Created 180min booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_admin_create_booking_without_duration_uses_default(self):
        """Test that booking without duration field uses court's default slot_duration"""
        test_email = f"test_duration_default@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User Default"
            })
        except:
            pass
        
        # Create booking without durata field
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel1",  # padel courts have 90min default
                "data": TEST_DATE,
                "ora_inizio": "20:00"
                # No durata field
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert booking["ora_inizio"] == "20:00"
        assert booking["ora_fine"] == "21:30"  # Default 90min for padel
        
        print(f"✓ Created default duration booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
    
    def test_update_booking_duration(self):
        """Test updating an existing booking's duration"""
        test_email = f"test_duration_update@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User Update"
            })
        except:
            pass
        
        # Create initial booking with 90min
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel3",
                "data": TEST_DATE,
                "ora_inizio": "21:00",
                "durata": 90
            }
        )
        
        assert create_response.status_code == 200
        booking = create_response.json()
        booking_id = booking["id"]
        
        assert booking["ora_fine"] == "22:30"  # Initial: 90min
        print(f"✓ Created initial booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Update to 120min duration
        update_response = self.session.put(
            f"{BASE_URL}/api/bookings/{booking_id}",
            json={"durata": 120}
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_booking = update_response.json()
        assert updated_booking["ora_fine"] == "23:00"  # Now 2 hours from 21:00
        
        print(f"✓ Updated booking duration to 120min: {updated_booking['ora_inizio']} - {updated_booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking_id}")
    
    def test_update_booking_time_and_duration(self):
        """Test updating both start time and duration"""
        test_email = f"test_duration_both@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Test User Both"
            })
        except:
            pass
        
        # Create initial booking
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel4",
                "data": TEST_DATE,
                "ora_inizio": "08:30",
                "durata": 60
            }
        )
        
        assert create_response.status_code == 200
        booking = create_response.json()
        booking_id = booking["id"]
        
        print(f"✓ Created booking: {booking['ora_inizio']} - {booking['ora_fine']}")
        
        # Update both time and duration
        update_response = self.session.put(
            f"{BASE_URL}/api/bookings/{booking_id}",
            json={
                "ora_inizio": "09:00",
                "durata": 150  # 2h30min
            }
        )
        
        assert update_response.status_code == 200
        
        updated_booking = update_response.json()
        assert updated_booking["ora_inizio"] == "09:00"
        assert updated_booking["ora_fine"] == "11:30"  # 9:00 + 2h30min
        
        print(f"✓ Updated to: {updated_booking['ora_inizio']} - {updated_booking['ora_fine']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
