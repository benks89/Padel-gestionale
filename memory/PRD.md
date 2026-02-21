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
7. **PWA + Push Notifications:** App installabile su telefono con notifiche push

## Stack Tecnologico
- **Backend:** FastAPI, Python, MongoDB (motor), pywebpush
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Auth:** JWT
- **PWA:** Service Worker, Web Push API, VAPID

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

### Fase 5 - Sezione Clienti (Completato - 21/02/2026)
- [x] Pagina elenco clienti registrati
- [x] Ricerca per nome, email, telefono
- [x] Visualizzazione data registrazione
- [x] Solo admin/super_admin (no viewer)

### Fase 6 - Notifiche In-App (Completato - 21/02/2026)
- [x] Sistema notifiche nel database
- [x] Campanella con badge contatore
- [x] Dropdown notifiche con lista
- [x] Segna come letta / Segna tutte lette
- [x] Notifica automatica alla creazione prenotazione

### Fase 7 - PWA + Push Notifications (Completato - 21/02/2026)
- [x] manifest.json per installazione app
- [x] Service Worker per caching e push
- [x] Icone PWA multiple risoluzioni
- [x] Integrazione Web Push con VAPID
- [x] Endpoint subscribe/unsubscribe push
- [x] Pulsante "Attiva Push" nella navbar
- [x] Notifiche push al telefono quando app chiusa

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

### notifications
```
{
  "id": str,
  "type": str,
  "title": str,
  "message": str,
  "booking_id": str (opzionale),
  "created_by": str,
  "created_by_nome": str,
  "is_admin_action": bool,
  "timestamp": str,
  "read_by": [str]
}
```

### push_subscriptions
```
{
  "endpoint": str,
  "keys": { "p256dh": str, "auth": str },
  "admin_email": str,
  "created_at": str
}
```

## Credenziali Test
- Super Admin: admin@sportcenter.com / admin123
- Viewer: viewer@sportcenter.com / viewer123

## Come Installare la PWA
1. Apri l'app su Chrome/Safari sul telefono
2. Clicca "Aggiungi alla schermata Home" (Android) o il pulsante condividi → "Aggiungi a Home" (iOS)
3. Accedi come admin
4. Clicca "Attiva Push" nella navbar
5. Consenti le notifiche quando richiesto
6. Ora riceverai notifiche push anche quando l'app è chiusa!

## Backlog / Future Tasks
- [ ] Vista campo calcio a 7 nel calendario admin
- [ ] Report statistiche avanzate
- [ ] Export prenotazioni in Excel/PDF
- [ ] Integrazione pagamenti

## Files Chiave
- /app/backend/server.py - Backend principale
- /app/frontend/src/pages/AdminCalendar.js - Calendario multi-campo
- /app/frontend/src/pages/AdminManagement.js - Gestione admin
- /app/frontend/src/pages/AdminUsers.js - Elenco clienti
- /app/frontend/src/pages/ActivityLogs.js - Log attività
- /app/frontend/src/components/NotificationBell.js - Campanella notifiche
- /app/frontend/src/components/PushNotificationToggle.js - Toggle push
- /app/frontend/public/sw.js - Service Worker PWA
- /app/frontend/public/manifest.json - PWA Manifest
