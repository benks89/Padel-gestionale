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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str
    nome: str
    role: str = "user"

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

class BookingUpdate(BaseModel):
    data: Optional[str] = None
    ora_inizio: Optional[str] = None

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
    return current_user

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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_data.email})
    return {
        "token": token,
        "user": {
            "email": user_data.email,
            "nome": user_data.nome,
            "role": "user"
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_access_token({"sub": credentials.email})
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "nome": user["nome"],
            "role": user.get("role", "user")
        }
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

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
    
    hour, minute = map(int, booking_data.ora_inizio.split(':'))
    total_minutes = hour * 60 + minute + court["slot_duration"]
    ora_fine = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    
    existing_booking = await db.bookings.find_one({
        "court_id": booking_data.court_id,
        "data": booking_data.data,
        "ora_inizio": booking_data.ora_inizio
    })
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Slot già prenotato")
    
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
    
    if booking["user_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    update_fields = {}
    if update_data.data:
        update_fields["data"] = update_data.data
    if update_data.ora_inizio:
        court = await db.courts.find_one({"id": booking["court_id"]}, {"_id": 0})
        hour, minute = map(int, update_data.ora_inizio.split(':'))
        total_minutes = hour * 60 + minute + court["slot_duration"]
        update_fields["ora_inizio"] = update_data.ora_inizio
        update_fields["ora_fine"] = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    
    if update_fields:
        await db.bookings.update_one({"id": booking_id}, {"$set": update_fields})
        booking.update(update_fields)
    
    return Booking(**booking)

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    
    if booking["user_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Prenotazione cancellata"}

@api_router.post("/admin/bookings", response_model=Booking)
async def admin_create_booking(booking_data: BookingCreate, user_email: str, current_user: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"email": user_email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    court = await db.courts.find_one({"id": booking_data.court_id}, {"_id": 0})
    if not court:
        raise HTTPException(status_code=404, detail="Campo non trovato")
    
    hour, minute = map(int, booking_data.ora_inizio.split(':'))
    total_minutes = hour * 60 + minute + court["slot_duration"]
    ora_fine = f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    
    existing_booking = await db.bookings.find_one({
        "court_id": booking_data.court_id,
        "data": booking_data.data,
        "ora_inizio": booking_data.ora_inizio
    })
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Slot già prenotato")
    
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()