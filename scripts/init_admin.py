import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_admin():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    admin_email = "admin@sportcenter.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if existing_admin:
        print(f"Admin già esistente: {admin_email}")
    else:
        admin_user = {
            "email": admin_email,
            "password_hash": pwd_context.hash("admin123"),
            "nome": "Amministratore",
            "role": "admin",
            "created_at": "2026-01-01T00:00:00"
        }
        await db.users.insert_one(admin_user)
        print(f"✓ Admin creato: {admin_email}")
        print(f"  Password: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_admin())
