# SportCenter Pro - PRD

## Problema Originale
Applicazione per gestire le prenotazioni di un centro sportivo con 4 campi da padel e un campo da calcio a 7.

## Requisiti Chiave
1. **Autenticazione:** Login classico con email e password per utenti e amministratori
2. **Prenotazioni Utente:** Creare, visualizzare, cancellare e modificare prenotazioni
3. **Slot temporali:** 30 minuti di intervallo, dalle 7:30 a mezzanotte
4. **Durate:** Padel 1h30min (default), Calcio 1h (default), ma personalizzabile (30min, 1h, 1h30min, 2h, 2h30min, 3h)
5. **Pannello Admin:** Vista calendario multi-campo, gestione prenotazioni
6. **Sistema Multi-Admin:** Ruoli (super_admin, admin, viewer), gestione admin, log attività

## Stack Tecnologico
- **Backend:** FastAPI, Python, MongoDB (motor)
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Auth:** JWT

## Cosa è stato implementato

### Fase 1 - Core (Completato)
- [x] Struttura progetto full-stack
- [x] Autenticazione JWT (login/registrazione)
- [x] CRUD prenotazioni utente
- [x] Dashboard utente
- [x] Dashboard admin base

### Fase 2 - Admin Calendar (Completato)
- [x] Vista calendario multi-campo (4 campi padel)
- [x] Slot ogni 30 minuti
- [x] Modale creazione prenotazione (cliente esistente/nuovo)
- [x] Modale modifica prenotazione
- [x] Selettore data (calendar picker)
- [x] Vista compatta senza scroll

### Fase 3 - Durata Personalizzabile (Completato - 21/02/2026)
- [x] Backend: campo `durata` in BookingCreate/BookingUpdate
- [x] Frontend: dropdown durata con 6 opzioni (30, 60, 90, 120, 150, 180 min)
- [x] Default 1h30min (90 min)
- [x] Calcolo corretto ora_fine basato su durata

### Fase 4 - Sistema Multi-Admin (Completato - 21/02/2026)
- [x] 3 ruoli: super_admin, admin, viewer
- [x] Pagina Gestione Admin (solo super_admin)
- [x] CRUD admin con validazioni
- [x] Pagina Log Attività con filtri
- [x] Tracciamento chi crea prenotazioni (created_by_admin)
- [x] Restrizioni viewer: solo visualizzazione, no dati clienti
- [x] Badge ruolo nella navbar

## Schema Database

### users
```
{
  "email": str,
  "password_hash": str,
  "nome": str,
  "role": "user" | "admin",
  "admin_role": "super_admin" | "admin" | "viewer" (solo per admin),
  "is_active": bool,
  "telefono": str (opzionale),
  "created_at": str
}
```

### bookings
```
{
  "id": str,
  "user_email": str,
  "user_nome": str,
  "court_id": str,
  "court_nome": str,
  "court_tipo": str,
  "data": str,
  "ora_inizio": str,
  "ora_fine": str,
  "created_at": str,
  "created_by_admin": str (opzionale),
  "created_by_admin_nome": str (opzionale)
}
```

### activity_logs
```
{
  "id": str,
  "action": "create" | "update" | "delete",
  "entity_type": "booking" | "admin",
  "entity_id": str,
  "admin_email": str,
  "admin_nome": str,
  "details": str,
  "timestamp": str
}
```

## API Endpoints Chiave

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Admin Management
- GET /api/admin/admins
- POST /api/admin/admins (super_admin only)
- PUT /api/admin/admins/{email} (super_admin only)
- DELETE /api/admin/admins/{email} (super_admin only)

### Activity Logs
- GET /api/admin/activity-logs

### Bookings
- POST /api/admin/bookings?user_email={email} (admin/super_admin)
- PUT /api/bookings/{id} (admin/super_admin)
- DELETE /api/bookings/{id} (admin/super_admin)

## Credenziali Test
- Super Admin: admin@sportcenter.com / admin123
- Viewer: viewer@sportcenter.com / viewer123

## Backlog / Future Tasks
- [ ] Notifiche email per prenotazioni
- [ ] Vista campo calcio a 7 nel calendario admin
- [ ] Report statistiche avanzate
- [ ] Export prenotazioni in Excel/PDF
- [ ] Integrazione pagamenti

## Files Chiave
- /app/backend/server.py - Backend principale
- /app/frontend/src/pages/AdminCalendar.js - Calendario multi-campo
- /app/frontend/src/pages/AdminManagement.js - Gestione admin
- /app/frontend/src/pages/ActivityLogs.js - Log attività
- /app/frontend/src/pages/AdminDashboard.js - Dashboard admin
