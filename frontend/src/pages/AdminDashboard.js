import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, Clock, Trash2, LogOut, Filter, CalendarDays, Users, Activity, Shield, UserCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer'
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCourt, setFilterCourt] = useState('all');
  const [courts, setCourts] = useState([]);

  const isViewer = user?.admin_role === 'viewer';
  const isSuperAdmin = user?.admin_role === 'super_admin';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (filterCourt === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(b => b.court_id === filterCourt));
    }
  }, [filterCourt, bookings]);

  const fetchData = async () => {
    try {
      const [bookingsRes, courtsRes] = await Promise.all([
        axios.get(`${API_URL}/bookings`),
        axios.get(`${API_URL}/courts`)
      ]);
      setBookings(bookingsRes.data);
      setFilteredBookings(bookingsRes.data);
      setCourts(courtsRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Vuoi cancellare questa prenotazione?')) return;

    try {
      await axios.delete(`${API_URL}/bookings/${bookingId}`);
      toast.success('Prenotazione cancellata');
      fetchData();
    } catch (error) {
      toast.error('Errore nella cancellazione');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const stats = {
    total: bookings.length,
    padel: bookings.filter(b => b.court_tipo === 'padel').length,
    calcio: bookings.filter(b => b.court_tipo === 'calcio').length
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200" data-testid="admin-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">ADMIN PANEL</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin/calendar')}
                data-testid="calendar-view-btn"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Calendario
              </Button>
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/admin/management')}
                  data-testid="admin-management-btn"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Gestione Admin
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin/logs')}
                data-testid="activity-logs-btn"
              >
                <Activity className="w-4 h-4 mr-2" />
                Log Attività
              </Button>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {roleLabels[user?.admin_role] || 'Admin'}
                </Badge>
                <span><strong>{user?.nome}</strong></span>
              </div>
              <Button variant="ghost" onClick={handleLogout} size="sm" data-testid="admin-logout-btn">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2" data-testid="admin-title">Gestione Prenotazioni</h1>
          <p className="text-slate-600">Panoramica completa di tutte le prenotazioni</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6" data-testid="stat-total">
            <div className="text-sm font-medium text-slate-600 mb-1">Prenotazioni Totali</div>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6" data-testid="stat-padel">
            <div className="text-sm font-medium text-slate-600 mb-1">Padel</div>
            <div className="text-3xl font-bold text-blue-600">{stats.padel}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6" data-testid="stat-soccer">
            <div className="text-sm font-medium text-slate-600 mb-1">Calcio a 7</div>
            <div className="text-3xl font-bold text-green-600">{stats.calcio}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Tutte le Prenotazioni</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <Select value={filterCourt} onValueChange={setFilterCourt}>
                  <SelectTrigger className="w-48" data-testid="filter-court-select">
                    <SelectValue placeholder="Filtra per campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i campi</SelectItem>
                    {courts.map(court => (
                      <SelectItem key={court.id} value={court.id}>{court.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => navigate('/booking')} data-testid="admin-new-booking-btn" disabled={isViewer}>
                Nuova Prenotazione
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">Caricamento...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-slate-600" data-testid="no-admin-bookings">
              Nessuna prenotazione trovata
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="bookings-table">
                <thead className="border-b border-slate-200">
                  <tr className="text-left text-sm font-medium text-slate-600">
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Campo</th>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Orario</th>
                    <th className="pb-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-slate-100" data-testid={`admin-booking-row-${booking.id}`}>
                      <td className="py-4">
                        <div>
                          <div className="font-medium">{booking.user_nome}</div>
                          <div className="text-sm text-slate-600">{booking.user_email}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <div className="font-medium">{booking.court_nome}</div>
                          <span className="inline-block px-2 py-1 bg-blue-50 text-primary text-xs font-medium rounded mt-1">
                            {booking.court_tipo === 'padel' ? 'Padel' : 'Calcio'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(booking.data).toLocaleDateString('it-IT')}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {booking.ora_inizio} - {booking.ora_fine}
                        </div>
                      </td>
                      <td className="py-4">
                        {!isViewer && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(booking.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            data-testid={`admin-delete-${booking.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}