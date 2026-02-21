import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { LogOut, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3 } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminCalendar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [bookingForm, setBookingForm] = useState({ 
    selectedUser: '', 
    name: '', 
    email: '', 
    telefono: '',
    isNewUser: false 
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    court_id: '',
    data: '',
    ora_inizio: '',
    durata: 90
  });

  const timeSlots = [];
  for (let hour = 8; hour < 23; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  const allTimeSlots = [];
  for (let hour = 7; hour < 24; hour++) {
    allTimeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    allTimeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [courtsRes, bookingsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/courts`),
        axios.get(`${API_URL}/bookings`),
        axios.get(`${API_URL}/users`)
      ]);
      
      const padelCourts = courtsRes.data.filter(c => c.tipo === 'padel');
      setCourts(padelCourts);
      setUsers(usersRes.data.filter(u => u.role !== 'admin'));
      
      const dayBookings = bookingsRes.data.filter(b => 
        b.data === dateStr && padelCourts.some(c => c.id === b.court_id)
      );
      setBookings(dayBookings);
    } catch (error) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getBookingForSlot = (courtId, timeSlot) => {
    const slotMinutes = timeToMinutes(timeSlot);
    return bookings.find(b => {
      if (b.court_id !== courtId) return false;
      const startMinutes = timeToMinutes(b.ora_inizio);
      const endMinutes = timeToMinutes(b.ora_fine);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const getBookingHeight = (booking) => {
    const start = timeToMinutes(booking.ora_inizio);
    const end = timeToMinutes(booking.ora_fine);
    const duration = end - start;
    return (duration / 30) * 35;
  };

  const getBookingTop = (booking) => {
    const start = timeToMinutes(booking.ora_inizio);
    const firstSlot = timeToMinutes(timeSlots[0]);
    return ((start - firstSlot) / 30) * 35;
  };

  const handleSlotClick = (courtId, timeSlot) => {
    const booking = getBookingForSlot(courtId, timeSlot);
    if (booking) {
      setEditingBooking(booking);
      const court = courts.find(c => c.id === booking.court_id);
      setEditForm({
        court_id: booking.court_id,
        data: booking.data,
        ora_inizio: booking.ora_inizio,
        durata: court?.slot_duration || 90
      });
      setShowEditDialog(true);
    } else {
      setSelectedSlot({ courtId, timeSlot });
      setBookingForm({ selectedUser: '', name: '', email: '', telefono: '', isNewUser: false });
      setShowDialog(true);
    }
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking) return;

    try {
      const startMinutes = timeToMinutes(editForm.ora_inizio);
      const endMinutes = startMinutes + editForm.durata;
      const ora_fine = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      await axios.put(`${API_URL}/bookings/${editingBooking.id}`, {
        data: editForm.data,
        ora_inizio: editForm.ora_inizio
      });

      if (editForm.court_id !== editingBooking.court_id) {
        await axios.delete(`${API_URL}/bookings/${editingBooking.id}`);
        await axios.post(
          `${API_URL}/admin/bookings?user_email=${editingBooking.user_email}`,
          {
            court_id: editForm.court_id,
            data: editForm.data,
            ora_inizio: editForm.ora_inizio
          }
        );
      }

      toast.success('Prenotazione aggiornata');
      setShowEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'aggiornamento');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    try {
      await axios.delete(`${API_URL}/bookings/${bookingId}`);
      toast.success('Prenotazione cancellata');
      fetchData();
    } catch (error) {
      toast.error('Errore nella cancellazione');
    }
  };

  const handleCreateBooking = async () => {
    let userEmail = bookingForm.email;
    
    if (bookingForm.isNewUser) {
      if (!bookingForm.name || !bookingForm.email) {
        toast.error('Inserisci nome ed email');
        return;
      }
      
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email: bookingForm.email,
          password: 'temp123',
          nome: bookingForm.name,
          telefono: bookingForm.telefono || null
        });
      } catch (error) {
        if (error.response?.status !== 400) {
          toast.error('Errore nella creazione utente');
          return;
        }
      }
    } else {
      if (!bookingForm.selectedUser) {
        toast.error('Seleziona un cliente');
        return;
      }
      const selectedUserData = users.find(u => u.email === bookingForm.selectedUser);
      userEmail = selectedUserData.email;
    }

    try {
      await axios.post(
        `${API_URL}/admin/bookings?user_email=${userEmail}`,
        {
          court_id: selectedSlot.courtId,
          data: format(selectedDate, 'yyyy-MM-dd'),
          ora_inizio: selectedSlot.timeSlot
        }
      );

      toast.success('Prenotazione creata');
      setShowDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="admin-calendar-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">ADMIN - CALENDARIO</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin')}
                data-testid="back-to-admin-btn"
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-sm text-slate-600">Admin: <strong>{user?.nome}</strong></span>
              <Button variant="ghost" onClick={handleLogout} size="sm" data-testid="admin-logout-btn">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8 max-w-7xl py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                data-testid="prev-day-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <span className="text-xl font-semibold">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                data-testid="next-day-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
              data-testid="today-btn"
            >
              Oggi
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Caricamento...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid grid-cols-[80px_repeat(4,1fr)] border-b border-slate-200">
                  <div className="p-4 bg-slate-50 border-r border-slate-200"></div>
                  {courts.map(court => (
                    <div
                      key={court.id}
                      className="p-4 bg-slate-50 border-r border-slate-200 text-center font-semibold"
                      data-testid={`court-header-${court.id}`}
                    >
                      {court.nome}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[80px_repeat(4,1fr)]">
                  <div className="relative">
                    {timeSlots.map((time, idx) => (
                      <div
                        key={time}
                        className="h-[35px] border-b border-slate-200 flex items-center justify-center text-xs text-slate-600 font-medium"
                        style={{ height: '35px' }}
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {courts.map(court => (
                    <div key={court.id} className="relative border-l border-slate-200">
                      {timeSlots.map((time, idx) => {
                        const booking = getBookingForSlot(court.id, time);
                        const isBookingStart = booking && booking.ora_inizio === time;
                        
                        return (
                          <div
                            key={time}
                            className="h-[35px] border-b border-slate-200 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => !booking && handleSlotClick(court.id, time)}
                            data-testid={`slot-${court.id}-${time}`}
                            style={{ height: '35px' }}
                          />
                        );
                      })}

                      {bookings
                        .filter(b => b.court_id === court.id)
                        .map(booking => (
                          <div
                            key={booking.id}
                            className="absolute left-1 right-1 bg-blue-400 text-white rounded p-1 shadow-md cursor-pointer hover:bg-blue-500 transition-colors overflow-hidden"
                            style={{
                              top: `${getBookingTop(booking)}px`,
                              height: `${getBookingHeight(booking)}px`
                            }}
                            onClick={() => handleSlotClick(court.id, booking.ora_inizio)}
                            data-testid={`booking-${booking.id}`}
                          >
                            <div className="text-[10px] font-semibold leading-tight">{booking.ora_inizio} - {booking.ora_fine}</div>
                            <div className="text-[10px] font-medium leading-tight mt-0.5">{booking.user_nome}</div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="create-booking-dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova Prenotazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                type="button"
                variant={!bookingForm.isNewUser ? "default" : "outline"}
                onClick={() => setBookingForm({ ...bookingForm, isNewUser: false, name: '', email: '', telefono: '' })}
                className="flex-1"
                data-testid="existing-user-btn"
              >
                Cliente Esistente
              </Button>
              <Button
                type="button"
                variant={bookingForm.isNewUser ? "default" : "outline"}
                onClick={() => setBookingForm({ ...bookingForm, isNewUser: true, selectedUser: '' })}
                className="flex-1"
                data-testid="new-user-btn"
              >
                Nuovo Cliente
              </Button>
            </div>

            {!bookingForm.isNewUser ? (
              <div className="space-y-2">
                <Label>Seleziona Cliente</Label>
                <Select 
                  value={bookingForm.selectedUser} 
                  onValueChange={(value) => setBookingForm({ ...bookingForm, selectedUser: value })}
                >
                  <SelectTrigger data-testid="select-existing-user">
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {users.map(user => (
                      <SelectItem key={user.email} value={user.email}>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.nome}</span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                          {user.telefono && <span className="text-xs text-slate-500">{user.telefono}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {users.length === 0 && (
                  <p className="text-sm text-slate-500">Nessun cliente registrato. Crea un nuovo cliente.</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Nome Cliente *</Label>
                  <Input
                    placeholder="Mario Rossi"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    data-testid="booking-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Cliente *</Label>
                  <Input
                    type="email"
                    placeholder="mario@esempio.it"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    data-testid="booking-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefono (opzionale)</Label>
                  <Input
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={bookingForm.telefono}
                    onChange={(e) => setBookingForm({ ...bookingForm, telefono: e.target.value })}
                    data-testid="booking-telefono-input"
                  />
                </div>
              </>
            )}

            {selectedSlot && (
              <div className="bg-slate-50 p-4 rounded-md text-sm">
                <div><strong>Campo:</strong> {courts.find(c => c.id === selectedSlot.courtId)?.nome}</div>
                <div><strong>Orario:</strong> {selectedSlot.timeSlot}</div>
                <div><strong>Durata:</strong> 1h 30min</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} data-testid="cancel-dialog-btn">
              Annulla
            </Button>
            <Button onClick={handleCreateBooking} data-testid="confirm-create-booking-btn">
              Crea Prenotazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg" data-testid="edit-booking-dialog">
          <DialogHeader>
            <DialogTitle>Modifica Prenotazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="font-semibold text-lg mb-1">{editingBooking?.user_nome}</div>
              <div className="text-sm text-slate-600">{editingBooking?.user_email}</div>
            </div>

            <div className="space-y-2">
              <Label>Campo</Label>
              <Select 
                value={editForm.court_id} 
                onValueChange={(value) => {
                  const court = courts.find(c => c.id === value);
                  setEditForm({ ...editForm, court_id: value, durata: court?.slot_duration || 90 });
                }}
              >
                <SelectTrigger data-testid="edit-court-select">
                  <SelectValue placeholder="Seleziona campo" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map(court => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Orario Inizio</Label>
                <Select 
                  value={editForm.ora_inizio} 
                  onValueChange={(value) => setEditForm({ ...editForm, ora_inizio: value })}
                >
                  <SelectTrigger data-testid="edit-time-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allTimeSlots.map(time => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Durata</Label>
                <Select 
                  value={editForm.durata.toString()} 
                  onValueChange={(value) => setEditForm({ ...editForm, durata: parseInt(value) })}
                >
                  <SelectTrigger data-testid="edit-duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1h 00min</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2h 00min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-md">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Orario:</span>
                  <span className="font-semibold">
                    {editForm.ora_inizio} - {
                      (() => {
                        const start = timeToMinutes(editForm.ora_inizio);
                        const end = start + editForm.durata;
                        return `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`;
                      })()
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Campo:</span>
                  <span className="font-semibold">{courts.find(c => c.id === editForm.court_id)?.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Durata:</span>
                  <span className="font-semibold">
                    {editForm.durata === 60 ? '1h 00min' : editForm.durata === 90 ? '1h 30min' : '2h 00min'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (window.confirm('Vuoi cancellare questa prenotazione?')) {
                  handleDeleteBooking(editingBooking.id);
                  setShowEditDialog(false);
                }
              }}
              data-testid="delete-booking-btn"
            >
              Cancella
            </Button>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="cancel-edit-btn">
              Annulla
            </Button>
            <Button onClick={handleUpdateBooking} data-testid="save-booking-btn">
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
