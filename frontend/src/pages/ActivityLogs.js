import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { LogOut, Activity, ChevronLeft, Plus, Edit, Trash2, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import NotificationBell from '@/components/NotificationBell';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const actionIcons = {
  create: Plus,
  update: Edit,
  delete: Trash2
};

const actionColors = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500'
};

const actionLabels = {
  create: 'Creazione',
  update: 'Modifica',
  delete: 'Eliminazione'
};

const entityLabels = {
  booking: 'Prenotazione',
  admin: 'Admin'
};

export default function ActivityLogs() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/activity-logs?limit=200`);
      setLogs(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei log');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.entity_type === filter);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return format(date, "d MMMM yyyy 'alle' HH:mm", { locale: it });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="activity-logs-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">LOG ATTIVITÀ</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin')}
                data-testid="back-to-admin-btn"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-sm text-slate-600">Admin: <strong>{user?.nome}</strong></span>
              <NotificationBell />
              <Button variant="ghost" onClick={handleLogout} size="sm" data-testid="admin-logout-btn">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8 max-w-7xl py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Registro Attività</h2>
              <Badge variant="secondary">{filteredLogs.length} eventi</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                data-testid="filter-all"
              >
                Tutti
              </Button>
              <Button
                variant={filter === 'booking' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('booking')}
                data-testid="filter-booking"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Prenotazioni
              </Button>
              <Button
                variant={filter === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('admin')}
                data-testid="filter-admin"
              >
                <User className="w-4 h-4 mr-1" />
                Admin
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Caricamento...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessuna attività registrata</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-200">
              {filteredLogs.map((log, idx) => {
                const ActionIcon = actionIcons[log.action] || Activity;
                const actionColor = actionColors[log.action] || 'bg-gray-500';
                const actionLabel = actionLabels[log.action] || log.action;
                const entityLabel = entityLabels[log.entity_type] || log.entity_type;
                
                return (
                  <div 
                    key={log.id || idx} 
                    className="p-4 hover:bg-slate-50 transition-colors"
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 ${actionColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <ActionIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{actionLabel}</Badge>
                          <Badge variant="secondary">{entityLabel}</Badge>
                        </div>
                        <p className="text-slate-900 font-medium">{log.details}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.admin_nome}
                          </span>
                          <span>{formatDate(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
