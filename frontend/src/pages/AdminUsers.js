import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { LogOut, Users, ChevronLeft, Search, Mail, Phone, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import NotificationBell from '@/components/NotificationBell';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminUsers() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isViewer = user?.admin_role === 'viewer';

  useEffect(() => {
    if (isViewer) {
      navigate('/admin');
      return;
    }
    fetchUsers();
  }, [isViewer, navigate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u => 
        u.nome.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.telefono && u.telefono.includes(term))
      ));
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: it });
    } catch {
      return 'N/A';
    }
  };

  if (isViewer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="admin-users-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">CLIENTI</span>
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
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Elenco Clienti</h2>
              <Badge variant="secondary">{filteredUsers.length} clienti</Badge>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca per nome, email, telefono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-users-input"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Caricamento...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm ? 'Nessun cliente trovato con questi criteri' : 'Nessun cliente registrato'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="users-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-sm font-medium text-slate-600">
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Telefono</th>
                    <th className="px-6 py-4">Data Registrazione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((cliente) => (
                    <tr 
                      key={cliente.email} 
                      className="hover:bg-slate-50 transition-colors"
                      data-testid={`user-row-${cliente.email}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {cliente.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{cliente.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {cliente.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cliente.telefono ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {cliente.telefono}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(cliente.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
