import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { LogOut, Users, Plus, Edit, Trash2, Shield, Eye, UserCog, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import NotificationBell from '@/components/NotificationBell';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleLabels = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500' },
  admin: { label: 'Admin', color: 'bg-blue-500' },
  viewer: { label: 'Viewer', color: 'bg-gray-500' }
};

const roleIcons = {
  super_admin: Shield,
  admin: UserCog,
  viewer: Eye
};

export default function AdminManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [createForm, setCreateForm] = useState({
    nome: '',
    email: '',
    password: '',
    admin_role: 'admin'
  });
  const [editForm, setEditForm] = useState({
    nome: '',
    admin_role: '',
    is_active: true
  });

  const isSuperAdmin = user?.admin_role === 'super_admin';

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/admins`);
      setAdmins(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento degli admin');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!createForm.nome || !createForm.email || !createForm.password) {
      toast.error('Compila tutti i campi');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/admins`, createForm);
      toast.success('Admin creato con successo');
      setShowCreateDialog(false);
      setCreateForm({ nome: '', email: '', password: '', admin_role: 'admin' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const handleEditAdmin = async () => {
    if (!editingAdmin) return;

    try {
      await axios.put(`${API_URL}/admin/admins/${editingAdmin.email}`, editForm);
      toast.success('Admin aggiornato');
      setShowEditDialog(false);
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'aggiornamento');
    }
  };

  const handleDeleteAdmin = async (email) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo admin?')) return;

    try {
      await axios.delete(`${API_URL}/admin/admins/${email}`);
      toast.success('Admin eliminato');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'eliminazione');
    }
  };

  const openEditDialog = (admin) => {
    setEditingAdmin(admin);
    setEditForm({
      nome: admin.nome,
      admin_role: admin.admin_role,
      is_active: admin.is_active !== false
    });
    setShowEditDialog(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="admin-management-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">GESTIONE ADMIN</span>
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
              <span className="text-sm text-slate-600">
                {roleLabels[user?.admin_role]?.label}: <strong>{user?.nome}</strong>
              </span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Lista Amministratori</h2>
              <Badge variant="secondary">{admins.length} admin</Badge>
            </div>
            {isSuperAdmin && (
              <Button onClick={() => setShowCreateDialog(true)} data-testid="add-admin-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Admin
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Caricamento...</div>
        ) : (
          <div className="grid gap-4">
            {admins.map(admin => {
              const RoleIcon = roleIcons[admin.admin_role] || UserCog;
              const roleInfo = roleLabels[admin.admin_role] || { label: 'Admin', color: 'bg-gray-500' };
              
              return (
                <div 
                  key={admin.email} 
                  className={`bg-white border border-slate-200 rounded-xl p-6 ${admin.is_active === false ? 'opacity-60' : ''}`}
                  data-testid={`admin-card-${admin.email}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${roleInfo.color} rounded-full flex items-center justify-center`}>
                        <RoleIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{admin.nome}</h3>
                          {admin.is_active === false && (
                            <Badge variant="destructive">Disabilitato</Badge>
                          )}
                          {admin.email === user?.email && (
                            <Badge variant="outline">Tu</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{admin.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                          {admin.created_at && (
                            <span className="text-xs text-slate-500">
                              Creato: {new Date(admin.created_at).toLocaleDateString('it-IT')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isSuperAdmin && admin.email !== user?.email && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(admin)}
                          data-testid={`edit-admin-${admin.email}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.email)}
                          data-testid={`delete-admin-${admin.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legenda Ruoli */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
          <h3 className="font-semibold mb-4">Legenda Ruoli</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Super Admin</p>
                <p className="text-sm text-slate-600">Gestisce tutto: admin, prenotazioni, impostazioni</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <UserCog className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-slate-600">Crea, modifica e cancella prenotazioni</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Viewer</p>
                <p className="text-sm text-slate-600">Solo visualizzazione calendario (no dati clienti)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="create-admin-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Amministratore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Mario Rossi"
                value={createForm.nome}
                onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                data-testid="create-admin-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="admin@esempio.it"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                data-testid="create-admin-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Password sicura"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                data-testid="create-admin-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select 
                value={createForm.admin_role} 
                onValueChange={(value) => setCreateForm({ ...createForm, admin_role: value })}
              >
                <SelectTrigger data-testid="create-admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateAdmin} data-testid="confirm-create-admin">
              Crea Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="edit-admin-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Amministratore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-md">
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-medium">{editingAdmin?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                data-testid="edit-admin-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select 
                value={editForm.admin_role} 
                onValueChange={(value) => setEditForm({ ...editForm, admin_role: value })}
              >
                <SelectTrigger data-testid="edit-admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Account Attivo</Label>
                <p className="text-sm text-slate-600">Disabilita per bloccare l'accesso</p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                data-testid="edit-admin-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleEditAdmin} data-testid="confirm-edit-admin">
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
