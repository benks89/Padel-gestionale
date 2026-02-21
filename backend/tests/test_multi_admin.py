"""
Test suite for multi-admin system features:
- Admin roles (super_admin, admin, viewer)
- Admin management (CRUD)
- Activity logs
- Booking created_by_admin tracking
- Viewer role restrictions
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@sportcenter.com"
SUPER_ADMIN_PASSWORD = "admin123"
VIEWER_EMAIL = "viewer@sportcenter.com"
VIEWER_PASSWORD = "viewer123"

# Test date
TEST_DATE = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')


class TestAdminLogin:
    """Test admin login returns correct admin_role"""
    
    def test_super_admin_login_returns_role(self):
        """Verify super_admin login returns admin_role field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["admin_role"] == "super_admin"
        print(f"✓ Super admin login successful with admin_role: {data['user']['admin_role']}")
    
    def test_viewer_login_returns_role(self):
        """Verify viewer login returns viewer admin_role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VIEWER_EMAIL,
            "password": VIEWER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert data["user"]["role"] == "admin"
        assert data["user"]["admin_role"] == "viewer"
        print(f"✓ Viewer login successful with admin_role: {data['user']['admin_role']}")


class TestAdminManagement:
    """Test admin CRUD operations (super_admin only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super_admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.super_admin_token = token
        else:
            pytest.skip("Super admin login failed")
        
        # Login as viewer
        self.viewer_session = requests.Session()
        self.viewer_session.headers.update({"Content-Type": "application/json"})
        viewer_login = self.viewer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VIEWER_EMAIL,
            "password": VIEWER_PASSWORD
        })
        
        if viewer_login.status_code == 200:
            viewer_token = viewer_login.json().get("token")
            self.viewer_session.headers.update({"Authorization": f"Bearer {viewer_token}"})
        
        yield
        
        # Cleanup test admin
        try:
            self.session.delete(f"{BASE_URL}/api/admin/admins/test_admin_new@example.com")
        except:
            pass
    
    def test_get_admins_list(self):
        """GET /api/admin/admins returns list of all admins"""
        response = self.session.get(f"{BASE_URL}/api/admin/admins")
        
        assert response.status_code == 200
        admins = response.json()
        
        assert isinstance(admins, list)
        assert len(admins) >= 1  # At least super_admin exists
        
        # Check admin structure
        admin = admins[0]
        assert "email" in admin
        assert "nome" in admin
        assert "admin_role" in admin
        
        print(f"✓ GET /api/admin/admins returned {len(admins)} admins")
    
    def test_create_admin_by_super_admin(self):
        """POST /api/admin/admins creates new admin (super_admin only)"""
        new_admin = {
            "email": "test_admin_new@example.com",
            "password": "testadmin123",
            "nome": "Test Admin New",
            "admin_role": "admin"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/admins", json=new_admin)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created["email"] == new_admin["email"]
        assert created["nome"] == new_admin["nome"]
        assert created["admin_role"] == "admin"
        assert created["is_active"] == True
        
        print(f"✓ Created new admin: {created['email']} with role {created['admin_role']}")
    
    def test_create_admin_duplicate_email_fails(self):
        """Creating admin with existing email fails"""
        # First create
        self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "test_admin_new@example.com",
            "password": "test123",
            "nome": "Test Admin",
            "admin_role": "admin"
        })
        
        # Try duplicate
        response = self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "test_admin_new@example.com",
            "password": "test456",
            "nome": "Test Admin Duplicate",
            "admin_role": "admin"
        })
        
        assert response.status_code == 400
        assert "Email già registrata" in response.json().get("detail", "")
        print("✓ Duplicate email admin creation correctly rejected")
    
    def test_update_admin(self):
        """PUT /api/admin/admins/{email} updates admin"""
        # First create an admin
        self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "test_admin_new@example.com",
            "password": "test123",
            "nome": "Original Name",
            "admin_role": "admin"
        })
        
        # Update the admin
        update_data = {
            "nome": "Updated Name",
            "admin_role": "viewer",
            "is_active": False
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/admins/test_admin_new@example.com",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated = response.json()
        assert updated["nome"] == "Updated Name"
        assert updated["admin_role"] == "viewer"
        assert updated["is_active"] == False
        
        print(f"✓ Updated admin: nome={updated['nome']}, role={updated['admin_role']}, active={updated['is_active']}")
    
    def test_delete_admin(self):
        """DELETE /api/admin/admins/{email} deletes admin"""
        # First create an admin
        create_resp = self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "test_admin_new@example.com",
            "password": "test123",
            "nome": "To Be Deleted",
            "admin_role": "admin"
        })
        
        # Delete the admin
        response = self.session.delete(f"{BASE_URL}/api/admin/admins/test_admin_new@example.com")
        
        assert response.status_code == 200
        assert "eliminato" in response.json().get("message", "").lower()
        
        # Verify deletion
        admins_response = self.session.get(f"{BASE_URL}/api/admin/admins")
        admins = admins_response.json()
        emails = [a["email"] for a in admins]
        assert "test_admin_new@example.com" not in emails
        
        print("✓ Admin deleted successfully and verified")
    
    def test_cannot_delete_self(self):
        """Super admin cannot delete themselves"""
        response = self.session.delete(f"{BASE_URL}/api/admin/admins/{SUPER_ADMIN_EMAIL}")
        
        assert response.status_code == 400
        assert "te stesso" in response.json().get("detail", "").lower()
        print("✓ Self-deletion correctly prevented")


class TestViewerRestrictions:
    """Test viewer role cannot modify data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup viewer session"""
        # Login as viewer
        self.viewer_session = requests.Session()
        self.viewer_session.headers.update({"Content-Type": "application/json"})
        
        viewer_login = self.viewer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VIEWER_EMAIL,
            "password": VIEWER_PASSWORD
        })
        
        if viewer_login.status_code == 200:
            viewer_token = viewer_login.json().get("token")
            self.viewer_session.headers.update({"Authorization": f"Bearer {viewer_token}"})
        else:
            pytest.skip("Viewer login failed")
        
        # Also setup super admin for creating test data
        self.admin_session = requests.Session()
        self.admin_session.headers.update({"Content-Type": "application/json"})
        admin_login = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if admin_login.status_code == 200:
            admin_token = admin_login.json().get("token")
            self.admin_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        yield
    
    def test_viewer_cannot_create_booking(self):
        """Viewer cannot create bookings via admin endpoint"""
        # First create a test user
        test_email = "viewer_test_user@example.com"
        try:
            self.admin_session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Viewer Test User"
            })
        except:
            pass
        
        # Try to create booking as viewer
        response = self.viewer_session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel1",
                "data": TEST_DATE,
                "ora_inizio": "10:00",
                "durata": 90
            }
        )
        
        assert response.status_code == 403
        assert "permessi" in response.json().get("detail", "").lower()
        print("✓ Viewer correctly blocked from creating bookings")
    
    def test_viewer_cannot_update_booking(self):
        """Viewer cannot update bookings"""
        # Create booking as super admin first
        test_email = "viewer_test_user2@example.com"
        try:
            self.admin_session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Viewer Test User 2"
            })
        except:
            pass
        
        create_response = self.admin_session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel2",
                "data": TEST_DATE,
                "ora_inizio": "11:00",
                "durata": 90
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test booking: {create_response.text}")
        
        booking_id = create_response.json()["id"]
        
        # Try to update as viewer
        response = self.viewer_session.put(
            f"{BASE_URL}/api/bookings/{booking_id}",
            json={"ora_inizio": "12:00"}
        )
        
        assert response.status_code == 403
        print("✓ Viewer correctly blocked from updating bookings")
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/bookings/{booking_id}")
    
    def test_viewer_cannot_delete_booking(self):
        """Viewer cannot delete bookings"""
        # Create booking as super admin
        test_email = "viewer_test_user3@example.com"
        try:
            self.admin_session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Viewer Test User 3"
            })
        except:
            pass
        
        create_response = self.admin_session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel3",
                "data": TEST_DATE,
                "ora_inizio": "13:00",
                "durata": 90
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test booking: {create_response.text}")
        
        booking_id = create_response.json()["id"]
        
        # Try to delete as viewer
        response = self.viewer_session.delete(f"{BASE_URL}/api/bookings/{booking_id}")
        
        assert response.status_code == 403
        print("✓ Viewer correctly blocked from deleting bookings")
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/bookings/{booking_id}")
    
    def test_viewer_cannot_see_client_data(self):
        """Viewer cannot access /api/users endpoint (client data)"""
        response = self.viewer_session.get(f"{BASE_URL}/api/users")
        
        assert response.status_code == 200
        users = response.json()
        
        # Viewer should get empty list
        assert users == []
        print("✓ Viewer correctly receives empty user list (no client data)")
    
    def test_viewer_cannot_create_admin(self):
        """Viewer cannot create new admins"""
        response = self.viewer_session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "hacker@example.com",
            "password": "hack123",
            "nome": "Hacker",
            "admin_role": "super_admin"
        })
        
        assert response.status_code == 403
        print("✓ Viewer correctly blocked from creating admins")


class TestActivityLogs:
    """Test activity log functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
        
        yield
    
    def test_get_activity_logs(self):
        """GET /api/admin/activity-logs returns log entries"""
        response = self.session.get(f"{BASE_URL}/api/admin/activity-logs")
        
        assert response.status_code == 200
        logs = response.json()
        
        assert isinstance(logs, list)
        print(f"✓ GET /api/admin/activity-logs returned {len(logs)} log entries")
    
    def test_activity_log_structure(self):
        """Activity log entries have correct structure"""
        # First create an admin to generate a log entry
        self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "log_test_admin@example.com",
            "password": "test123",
            "nome": "Log Test Admin",
            "admin_role": "admin"
        })
        
        # Get logs
        response = self.session.get(f"{BASE_URL}/api/admin/activity-logs")
        logs = response.json()
        
        # Find our log entry
        if len(logs) > 0:
            log = logs[0]  # Most recent
            assert "id" in log
            assert "action" in log
            assert "entity_type" in log
            assert "entity_id" in log
            assert "admin_email" in log
            assert "admin_nome" in log
            assert "details" in log
            assert "timestamp" in log
            
            print(f"✓ Log entry structure verified: action={log['action']}, entity_type={log['entity_type']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/admins/log_test_admin@example.com")
    
    def test_admin_action_creates_log(self):
        """Creating admin generates activity log"""
        # Get initial log count
        initial_logs = self.session.get(f"{BASE_URL}/api/admin/activity-logs").json()
        initial_count = len(initial_logs)
        
        # Create admin
        self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "log_action_test@example.com",
            "password": "test123",
            "nome": "Log Action Test",
            "admin_role": "viewer"
        })
        
        # Get new log count
        new_logs = self.session.get(f"{BASE_URL}/api/admin/activity-logs").json()
        
        # Should have at least one more log
        assert len(new_logs) > initial_count
        
        # Check the newest log is for admin creation
        newest_log = new_logs[0]
        assert newest_log["action"] == "create"
        assert newest_log["entity_type"] == "admin"
        
        print(f"✓ Admin creation logged: {newest_log['details']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/admins/log_action_test@example.com")


class TestBookingCreatedBy:
    """Test booking tracks created_by_admin info"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.admin_email = SUPER_ADMIN_EMAIL
            self.admin_nome = login_response.json()["user"]["nome"]
        else:
            pytest.skip("Admin login failed")
        
        yield
    
    def test_admin_booking_has_created_by(self):
        """Booking created by admin has created_by_admin_nome field"""
        # Create test user
        test_email = "created_by_test@example.com"
        try:
            self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": "test123",
                "nome": "Created By Test"
            })
        except:
            pass
        
        # Create booking as admin
        response = self.session.post(
            f"{BASE_URL}/api/admin/bookings?user_email={test_email}",
            json={
                "court_id": "padel4",
                "data": TEST_DATE,
                "ora_inizio": "15:00",
                "durata": 90
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        booking = response.json()
        assert "created_by_admin" in booking
        assert "created_by_admin_nome" in booking
        assert booking["created_by_admin"] == self.admin_email
        assert booking["created_by_admin_nome"] == self.admin_nome
        
        print(f"✓ Booking has created_by_admin_nome: {booking['created_by_admin_nome']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/bookings/{booking['id']}")


class TestAdminRoleValidation:
    """Test invalid role values are rejected"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup super admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Super admin login failed")
        
        yield
    
    def test_invalid_role_rejected_on_create(self):
        """Creating admin with invalid role fails"""
        response = self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "invalid_role_test@example.com",
            "password": "test123",
            "nome": "Invalid Role Test",
            "admin_role": "invalid_role"
        })
        
        assert response.status_code == 400
        assert "ruolo" in response.json().get("detail", "").lower()
        print("✓ Invalid admin_role correctly rejected on create")
    
    def test_invalid_role_rejected_on_update(self):
        """Updating admin with invalid role fails"""
        # First create valid admin
        self.session.post(f"{BASE_URL}/api/admin/admins", json={
            "email": "role_update_test@example.com",
            "password": "test123",
            "nome": "Role Update Test",
            "admin_role": "admin"
        })
        
        # Try to update with invalid role
        response = self.session.put(
            f"{BASE_URL}/api/admin/admins/role_update_test@example.com",
            json={"admin_role": "invalid_role"}
        )
        
        assert response.status_code == 400
        print("✓ Invalid admin_role correctly rejected on update")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/admins/role_update_test@example.com")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
