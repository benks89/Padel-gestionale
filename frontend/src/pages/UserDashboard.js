import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, Clock, Trash2, LogOut, Plus } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings/my`);
      setBookings(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento delle prenotazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Vuoi cancellare questa prenotazione?')) return;

    try {
      await axios.delete(`${API_URL}/bookings/${bookingId}`);
      toast.success('Prenotazione cancellata');
      fetchBookings();
    } catch (error) {
      toast.error('Errore nella cancellazione');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200" data-testid="user-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">SPORTCENTER PRO</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Ciao, <strong>{user?.nome}</strong></span>
              <Button variant="ghost" onClick={handleLogout} size="sm" data-testid="logout-btn">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2" data-testid="dashboard-title">Le Tue Prenotazioni</h1>
            <p className="text-slate-600">Gestisci le tue prenotazioni dei campi</p>
          </div>
          <Button 
            onClick={() => navigate('/booking')} 
            className="bg-primary hover:bg-blue-700 font-bold"
            data-testid="new-booking-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Prenotazione
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Caricamento...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200" data-testid="no-bookings-message">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Non hai ancora prenotazioni</p>
            <Button onClick={() => navigate('/booking')} data-testid="first-booking-btn">
              Crea la tua prima prenotazione
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="bookings-grid">
            {bookings.map((booking) => (
              <div 
                key={booking.id} 
                className="booking-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
                data-testid={`booking-card-${booking.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{booking.court_nome}</h3>
                    <span className="inline-block px-2 py-1 bg-blue-50 text-primary text-xs font-medium rounded">
                      {booking.court_tipo === 'padel' ? 'Padel' : 'Calcio a 7'}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(booking.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    data-testid={`delete-booking-${booking.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(booking.data).toLocaleDateString('it-IT', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{booking.ora_inizio} - {booking.ora_fine}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}