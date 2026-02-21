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

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminCalendar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: '', email: '' });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    court_id: '',
    data: '',
    ora_inizio: '',
    durata: 90
  });

  const timeSlots = [];
  for (let hour = 7; hour < 24; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 23) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [courtsRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/courts`),
        axios.get(`${API_URL}/bookings`)
      ]);
      
      const padelCourts = courtsRes.data.filter(c => c.tipo === 'padel');
      setCourts(padelCourts);
      
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
    return (duration / 30) * 60;
  };

  const getBookingTop = (booking) => {
    const start = timeToMinutes(booking.ora_inizio);
    const firstSlot = timeToMinutes(timeSlots[0]);
    return ((start - firstSlot) / 30) * 60;
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
      setBookingForm({ name: '', email: '' });
      setShowDialog(true);
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
    if (!bookingForm.name || !bookingForm.email) {
      toast.error('Inserisci nome ed email');
      return;
    }

    try {
      const userRes = await axios.get(`${API_URL}/auth/me`);
      if (!userRes.data) {
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
          email: bookingForm.email,
          password: 'temp123',
          nome: bookingForm.name
        });
      }

      await axios.post(
        `${API_URL}/admin/bookings?user_email=${bookingForm.email}`,
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
      if (error.response?.status === 404) {
        try {
          await axios.post(`${API_URL}/auth/register`, {
            email: bookingForm.email,
            password: 'temp123',
            nome: bookingForm.name
          });
          
          await axios.post(
            `${API_URL}/admin/bookings?user_email=${bookingForm.email}`,
            {
              court_id: selectedSlot.courtId,
              data: format(selectedDate, 'yyyy-MM-dd'),
              ora_inizio: selectedSlot.timeSlot
            }
          );
          
          toast.success('Prenotazione creata');
          setShowDialog(false);
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.detail || 'Errore nella creazione');
        }
      } else {
        toast.error(error.response?.data?.detail || 'Errore nella creazione');
      }
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
                        className="h-[60px] border-b border-slate-200 flex items-center justify-center text-sm text-slate-600 font-medium"
                        style={{ height: '60px' }}
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
                            className="h-[60px] border-b border-slate-200 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => !booking && handleSlotClick(court.id, time)}
                            data-testid={`slot-${court.id}-${time}`}
                            style={{ height: '60px' }}
                          />
                        );
                      })}

                      {bookings
                        .filter(b => b.court_id === court.id)
                        .map(booking => (
                          <div
                            key={booking.id}
                            className="absolute left-1 right-1 bg-blue-400 text-white rounded-md p-2 shadow-md cursor-pointer hover:bg-blue-500 transition-colors overflow-hidden"
                            style={{
                              top: `${getBookingTop(booking)}px`,
                              height: `${getBookingHeight(booking)}px`
                            }}
                            onClick={() => handleSlotClick(court.id, booking.ora_inizio)}
                            data-testid={`booking-${booking.id}`}
                          >
                            <div className="text-xs font-semibold">{booking.ora_inizio} - {booking.ora_fine}</div>
                            <div className="text-xs font-medium mt-1">{booking.user_nome}</div>
                            <div className="text-xs opacity-90 mt-0.5">{booking.court_tipo === 'padel' ? '1h30' : '1h'}</div>
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
        <DialogContent data-testid="create-booking-dialog">
          <DialogHeader>
            <DialogTitle>Nuova Prenotazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Cliente</Label>
              <Input
                placeholder="Mario Rossi"
                value={bookingForm.name}
                onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                data-testid="booking-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Cliente</Label>
              <Input
                type="email"
                placeholder="mario@esempio.it"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                data-testid="booking-email-input"
              />
            </div>
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
    </div>
  );
}
