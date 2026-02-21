from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from pywebpush import webpush, WebPushException
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# VAPID keys for push notifications
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'admin@sportcenter.com')

app = FastAPI()
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nome: str
    telefono: Optional[str] = None

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    nome: str
    admin_role: str = "admin"  # super_admin, admin, viewer

class AdminUpdate(BaseModel):
    nome: Optional[str] = None
    admin_role: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str
    nome: str
    role: str = "user"
    telefono: Optional[str] = None
    admin_role: Optional[str] = None
    is_active: bool = True

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str
    nome: str
    role: str = "admin"
    admin_role: str = "admin"
    is_active: bool = True
    created_at: Optional[str] = None

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    action: str
    entity_type: str
    entity_id: str
    admin_email: str
    admin_nome: str
    details: str
    timestamp: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: str  # booking_created, booking_updated, booking_deleted
    title: str
    message: str
    booking_id: Optional[str] = None
    created_by: str  # email of who triggered the notification
    created_by_nome: str
    is_admin_action: bool = False
    timestamp: str
    read_by: List[str] = []  # list of admin emails who read it

class Court(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    tipo: str
    slot_duration: int

class BookingCreate(BaseModel):
    court_id: str
    data: str
    ora_inizio: str
    durata: Optional[int] = None

class BookingUpdate(BaseModel):
    data: Optional[str] = None
    ora_inizio: Optional[str] = None
    durata: Optional[int] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_email: str
    user_nome: str
    court_id: str
    court_nome: str
    court_tipo: str
    data: str
    ora_inizio: str
    ora_fine: str
    created_at: str
    created_by_admin: Optional[str] = None
    created_by_admin_nome: Optional[str] = None

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if current_user.get("is_active") == False:
        raise HTTPException(status_code=403, detail="Account admin disabilitato")
    return current_user

async def get_super_admin(current_user: dict = Depends(get_admin_user)):
    if current_user.get("admin_role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user

async def get_editor_admin(current_user: dict = Depends(get_admin_user)):
    if current_user.get("admin_role") == "viewer":
        raise HTTPException(status_code=403, detail="Non hai i permessi per modificare")
    return current_user

async def log_activity(action: str, entity_type: str, entity_id: str, admin_email: str, admin_nome: str, details: str):
    log_id = f"LOG{datetime.now(timezone.utc).timestamp()}".replace(".", "")
    log_doc = {
        "id": log_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "admin_email": admin_email,
        "admin_nome": admin_nome,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(log_doc)

async def create_notification(
    notification_type: str,
    title: str,
    message: str,
    created_by: str,
    created_by_nome: str,
    is_admin_action: bool = False,
    booking_id: Optional[str] = None
):
    notif_id = f"NOTIF{datetime.now(timezone.utc).timestamp()}".replace(".", "")
    notif_doc = {
        "id": notif_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "booking_id": booking_id,
        "created_by": created_by,
        "created_by_nome": created_by_nome,
        "is_admin_action": is_admin_action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read_by": []
    }
    await db.notifications.insert_one(notif_doc)

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    user_doc = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "nome": user_data.nome,
        "role": "user",
        "telefono": user_data.telefono,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_data.email})
    return {
        "token": token,
        "user": {
            "email": user_data.email,
            "nome": user_data.nome,
            "role": "user",
            "telefono": user_data.telefono
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    if user.get("role") == "admin" and user.get("is_active") == False:
        raise HTTPException(status_code=403, detail="Account admin disabilitato")
    
    token = create_access_token({"sub": credentials.email})
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "nome": user["nome"],
            "role": user.get("role", "user"),
            "admin_role": user.get("admin_role"),
            "is_active": user.get("is_active", True)
        }
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_admin_user)):
    if current_user.get("admin_role") == "viewer":
        return []
    users = await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

# Admin Management Endpoints
@api_router.get("/admin/admins", response_model=List[AdminUser])
async def get_admins(current_user: dict = Depends(get_admin_user)):
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return admins

@api_router.post("/admin/admins", response_model=AdminUser)
async def create_admin(admin_data: AdminCreate, current_user: dict = Depends(get_super_admin)):
    existing = await db.users.find_one({"email": admin_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    if admin_data.admin_role not in ["super_admin", "admin", "viewer"]:
        raise HTTPException(status_code=400, detail="Ruolo non valido")
    
    admin_doc = {
        "email": admin_data.email,
        "password_hash": hash_password(admin_data.password),
        "nome": admin_data.nome,
        "role": "admin",
        "admin_role": admin_data.admin_role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_doc)
    
    await log_activity(
        action="create",
        entity_type="admin",
        entity_id=admin_data.email,
        admin_email=current_user["email"],
        admin_nome=current_user["nome"],
        details=f"Creato admin {admin_data.nome} ({admin_data.email}) con ruolo {admin_data.admin_role}"
    )
    
    return AdminUser(
        email=admin_data.email,
        nome=admin_data.nome,
        role="admin",
        admin_role=admin_data.admin_role,
        is_active=True,
        created_at=admin_doc["created_at"]
    )

@api_router.put("/admin/admins/{email}")
async def update_admin(email: str, update_data: AdminUpdate, current_user: dict = Depends(get_super_admin)):
    admin = await db.users.find_one({"email": email, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin non trovato")
    
    if email == current_user["email"] and update_data.is_active == False:
        raise HTTPException(status_code=400, detail="Non puoi disabilitare te stesso")
    
    update_fields = {}
    details_parts = []
    
    if update_data.nome is not None:
        update_fields["nome"] = update_data.nome
        details_parts.append(f"nome: {update_data.nome}")
    if update_data.admin_role is not None:
        if update_data.admin_role not in ["super_admin", "admin", "viewer"]:
            raise HTTPException(status_code=400, detail="Ruolo non valido")
        update_fields["admin_role"] = update_data.admin_role
        details_parts.append(f"ruolo: {update_data.admin_role}")
    if update_data.is_active is not None:
        update_fields["is_active"] = update_data.is_active
        details_parts.append(f"attivo: {update_data.is_active}")
    
    if update_fields:
        await db.users.update_one({"email": email}, {"$set": update_fields})
        
        await log_activity(
            action="update",
            entity_type="admin",
            entity_id=email,
            admin_email=current_user["email"],
            admin_nome=current_user["nome"],
            details=f"Modificato admin {admin['nome']}: {', '.join(details_parts)}"
        )
    
    updated = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.delete("/admin/admins/{email}")
async def delete_admin(email: str, current_user: dict = Depends(get_super_admin)):
    if email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    
    admin = await db.users.find_one({"email": email, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin non trovato")
    
    await db.users.delete_one({"email": email})
    
    await log_activity(
        action="delete",
        entity_type="admin",
        entity_id=email,
        admin_email=current_user["email"],
        admin_nome=current_user["nome"],
        details=f"Eliminato admin {admin['nome']} ({email})"
    )
    
    return {"message": "Admin eliminato"}

# Activity Logs Endpoints
@api_router.get("/admin/activity-logs", response_model=List[ActivityLog])
async def get_activity_logs(current_user: dict = Depends(get_admin_user), limit: int = 100):
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

# Notifications Endpoints
@api_router.get("/admin/notifications")
async def get_notifications(current_user: dict = Depends(get_admin_user), limit: int = 50):
    notifications = await db.notifications.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    # Add is_read field for current user
    for notif in notifications:
        notif["is_read"] = current_user["email"] in notif.get("read_by", [])
    return notifications

@api_router.get("/admin/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_admin_user)):
    count = await db.notifications.count_documents({
        "read_by": {"$ne": current_user["email"]}
    })
    return {"count": count}

@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$addToSet": {"read_by": current_user["email"]}}
    )
    if result.modified_count == 0:
        # Check if already read or not found
        notif = await db.notifications.find_one({"id": notification_id})
        if not notif:
            raise HTTPException(status_code=404, detail="Notifica non trovata")
    return {"message": "Notifica segnata come letta"}

@api_router.put("/admin/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_admin_user)):
    await db.notifications.update_many(
        {"read_by": {"$ne": current_user["email"]}},
        {"$addToSet": {"read_by": current_user["email"]}}
    )
    return {"message": "Tutte le notifiche segnate come lette"}

@api_router.get("/courts", response_model=List[Court])
async def get_courts():
    courts = await db.courts.find({}, {"_id": 0}).to_list(100)
    return courts

@api_router.get("/bookings/availability")
async def get_availability(court_id: str, data: str):
    court = await db.courts.find_one({"id": court_id}, {"_id": 0})
    if not court:
        raise HTTPException(status_code=404, detail="Campo non trovato")
    
    bookings = await db.bookings.find(
        {"court_id": court_id, "data": data},
        {"_id": 0}
    ).to_list(100)
    
    booked_slots = []
    for booking in bookings:
        booked_slots.append({
            "ora_inizio": booking["ora_inizio"],
            "ora_fine": booking["ora_fine"]
        })
    
    slot_duration = court["slot_duration"]
    all_slots = []
    
    start_hour = 7
    start_minute = 30
    end_hour = 24
    end_minute = 0
    
    current_time = start_hour * 60 + start_minute
    end_time = end_hour * 60 + end_minute
    
    def time_to_minutes(time_str):
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    
    def check_overlap(start1, end1, start2, end2):
        return start1 < end2 and start2 < end1
    
    while current_time < end_time:
        hour = current_time // 60
        minute = current_time % 60
        ora_inizio = f"{hour:02d}:{minute:02d}"
        
        next_time = current_time + slot_duration
        if next_time > end_time:
            break
        next_hour = next_time // 60
        next_minute = next_time % 60
        ora_fine = f"{next_hour:02d}:{next_minute:02d}"
        
        is_available = True
        for booked in booked_slots:
            booked_start = time_to_minutes(booked["ora_inizio"])
            booked_end = time_to_minutes(booked["ora_fine"])
            slot_start = current_time
            slot_end = next_time
            
            if check_overlap(slot_start, slot_end, booked_start, booked_end):
                is_available = False
                break
        
        all_slots.append({
            "ora_inizio": ora_inizio,
            "ora_fine": ora_fine,
            "available": is_available
        })
        
        current_time += 30
    
    return {"slots": all_slots}

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    court = await db.courts.find_one({"id": booking_data.court_id}, {"_id": 0})
    if not court:
        raise HTTPException(status_code=404, detail="Campo non trovato")
    
    duration = booking_data.durata if booking_data.durata else court["slot_duration"]
    
    hour, minute = map(int, booking_data.ora_inizio.split(':'))
    total_minutes = hour * 60 + minute + duration
    ora_fine = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    
    def time_to_minutes(time_str):
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    
    def check_overlap(start1, end1, start2, end2):
        return start1 < end2 and start2 < end1
    
    new_start = time_to_minutes(booking_data.ora_inizio)
    new_end = total_minutes
    
    existing_bookings = await db.bookings.find({
        "court_id": booking_data.court_id,
        "data": booking_data.data
    }, {"_id": 0}).to_list(100)
    
    for booking in existing_bookings:
        existing_start = time_to_minutes(booking["ora_inizio"])
        existing_end = time_to_minutes(booking["ora_fine"])
        
        if check_overlap(new_start, new_end, existing_start, existing_end):
            raise HTTPException(status_code=400, detail="Slot non disponibile - conflitto con prenotazione esistente")
    
    booking_id = f"BK{datetime.now(timezone.utc).timestamp()}".replace(".", "")
    
    booking_doc = {
        "id": booking_id,
        "user_email": current_user["email"],
        "user_nome": current_user["nome"],
        "court_id": booking_data.court_id,
        "court_nome": court["nome"],
        "court_tipo": court["tipo"],
        "data": booking_data.data,
        "ora_inizio": booking_data.ora_inizio,
        "ora_fine": ora_fine,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    
    # Create notification for admins (user booking)
    await create_notification(
        notification_type="booking_created",
        title="Nuova Prenotazione",
        message=f"{current_user['nome']} ha prenotato {court['nome']} il {booking_data.data} alle {booking_data.ora_inizio}",
        created_by=current_user["email"],
        created_by_nome=current_user["nome"],
        is_admin_action=False,
        booking_id=booking_id
    )
    
    return Booking(**{k: v for k, v in booking_doc.items() if k != "_id"})

@api_router.get("/bookings/my", response_model=List[Booking])
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find(
        {"user_email": current_user["email"]},
        {"_id": 0}
    ).sort("data", -1).to_list(1000)
    return bookings

@api_router.get("/bookings", response_model=List[Booking])
async def get_all_bookings(current_user: dict = Depends(get_admin_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("data", -1).to_list(1000)
    return bookings

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, update_data: BookingUpdate, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    is_admin = current_user.get("role") == "admin"
    if booking["user_email"] != current_user["email"] and not is_admin:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    if is_admin and current_user.get("admin_role") == "viewer":
        raise HTTPException(status_code=403, detail="Non hai i permessi per modificare")
    
    update_fields = {}
    if update_data.data:
        update_fields["data"] = update_data.data
    
    ora_inizio = update_data.ora_inizio if update_data.ora_inizio else booking["ora_inizio"]
    
    if update_data.ora_inizio or update_data.durata:
        court = await db.courts.find_one({"id": booking["court_id"]}, {"_id": 0})
        duration = update_data.durata if update_data.durata else court["slot_duration"]
        hour, minute = map(int, ora_inizio.split(':'))
        total_minutes = hour * 60 + minute + duration
        if update_data.ora_inizio:
            update_fields["ora_inizio"] = update_data.ora_inizio
        update_fields["ora_fine"] = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    
    if update_fields:
        await db.bookings.update_one({"id": booking_id}, {"$set": update_fields})
        booking.update(update_fields)
        
        if is_admin:
            await log_activity(
                action="update",
                entity_type="booking",
                entity_id=booking_id,
                admin_email=current_user["email"],
                admin_nome=current_user["nome"],
                details=f"Modificata prenotazione di {booking['user_nome']} per {booking['court_nome']} il {booking.get('data', update_data.data)}"
            )
    
    return Booking(**booking)

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    is_admin = current_user.get("role") == "admin"
    if booking["user_email"] != current_user["email"] and not is_admin:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    if is_admin and current_user.get("admin_role") == "viewer":
        raise HTTPException(status_code=403, detail="Non hai i permessi per eliminare")
    
    await db.bookings.delete_one({"id": booking_id})
    
    if is_admin:
        await log_activity(
            action="delete",
            entity_type="booking",
            entity_id=booking_id,
            admin_email=current_user["email"],
            admin_nome=current_user["nome"],
            details=f"Cancellata prenotazione di {booking['user_nome']} per {booking['court_nome']} il {booking['data']} alle {booking['ora_inizio']}"
        )
    
    return {"message": "Prenotazione cancellata"}

@api_router.post("/admin/bookings", response_model=Booking)
async def admin_create_booking(booking_data: BookingCreate, user_email: str, current_user: dict = Depends(get_editor_admin)):
    user = await db.users.find_one({"email": user_email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    court = await db.courts.find_one({"id": booking_data.court_id}, {"_id": 0})
    if not court:
        raise HTTPException(status_code=404, detail="Campo non trovato")
    
    duration = booking_data.durata if booking_data.durata else court["slot_duration"]
    
    hour, minute = map(int, booking_data.ora_inizio.split(':'))
    total_minutes = hour * 60 + minute + duration
    ora_fine = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    
    def time_to_minutes(time_str):
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    
    def check_overlap(start1, end1, start2, end2):
        return start1 < end2 and start2 < end1
    
    new_start = time_to_minutes(booking_data.ora_inizio)
    new_end = total_minutes
    
    existing_bookings = await db.bookings.find({
        "court_id": booking_data.court_id,
        "data": booking_data.data
    }, {"_id": 0}).to_list(100)
    
    for booking in existing_bookings:
        existing_start = time_to_minutes(booking["ora_inizio"])
        existing_end = time_to_minutes(booking["ora_fine"])
        
        if check_overlap(new_start, new_end, existing_start, existing_end):
            raise HTTPException(status_code=400, detail="Slot non disponibile - conflitto con prenotazione esistente")
    
    booking_id = f"BK{datetime.now(timezone.utc).timestamp()}".replace(".", "")
    
    booking_doc = {
        "id": booking_id,
        "user_email": user["email"],
        "user_nome": user["nome"],
        "court_id": booking_data.court_id,
        "court_nome": court["nome"],
        "court_tipo": court["tipo"],
        "data": booking_data.data,
        "ora_inizio": booking_data.ora_inizio,
        "ora_fine": ora_fine,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by_admin": current_user["email"],
        "created_by_admin_nome": current_user["nome"]
    }
    
    await db.bookings.insert_one(booking_doc)
    
    await log_activity(
        action="create",
        entity_type="booking",
        entity_id=booking_id,
        admin_email=current_user["email"],
        admin_nome=current_user["nome"],
        details=f"Creata prenotazione per {user['nome']} - {court['nome']} il {booking_data.data} alle {booking_data.ora_inizio}"
    )
    
    # Create notification for all admins (admin booking)
    await create_notification(
        notification_type="booking_created",
        title="Nuova Prenotazione (Admin)",
        message=f"{current_user['nome']} ha creato prenotazione per {user['nome']} - {court['nome']} il {booking_data.data} alle {booking_data.ora_inizio}",
        created_by=current_user["email"],
        created_by_nome=current_user["nome"],
        is_admin_action=True,
        booking_id=booking_id
    )
    
    return Booking(**{k: v for k, v in booking_doc.items() if k != "_id"})

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    courts = await db.courts.find_one()
    if not courts:
        default_courts = [
            {"id": "padel1", "nome": "Padel 1", "tipo": "padel", "slot_duration": 90},
            {"id": "padel2", "nome": "Padel 2", "tipo": "padel", "slot_duration": 90},
            {"id": "padel3", "nome": "Padel 3", "tipo": "padel", "slot_duration": 90},
            {"id": "padel4", "nome": "Padel 4", "tipo": "padel", "slot_duration": 90},
            {"id": "calcio1", "nome": "Calcio a 7", "tipo": "calcio", "slot_duration": 60}
        ]
        await db.courts.insert_many(default_courts)
        logger.info("Campi inizializzati")
    
    # Update existing admin to super_admin if not set
    await db.users.update_many(
        {"role": "admin", "admin_role": {"$exists": False}},
        {"$set": {"admin_role": "super_admin", "is_active": True}}
    )
    
    # Create index for activity logs
    await db.activity_logs.create_index("timestamp")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()