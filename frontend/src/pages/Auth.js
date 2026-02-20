import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', nome: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password);
        toast.success('Accesso effettuato!');
        navigate(user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        if (!formData.nome) {
          toast.error('Inserisci il tuo nome');
          setLoading(false);
          return;
        }
        const user = await register(formData.email, formData.password, formData.nome);
        toast.success('Registrazione completata!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 py-12 lg:px-16" data-testid="auth-form-container">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="self-start mb-8"
          data-testid="back-to-home-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Home
        </Button>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2" data-testid="auth-title">
              {isLogin ? 'ACCEDI' : 'REGISTRATI'}
            </h1>
            <p className="text-slate-600">
              {isLogin ? 'Bentornato! Accedi al tuo account.' : 'Crea un account per iniziare a prenotare.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="auth-form">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Mario Rossi"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="h-12 border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100"
                  data-testid="auth-name-input"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@esempio.it"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100"
                data-testid="auth-email-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100"
                data-testid="auth-password-input"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-blue-700 font-bold uppercase tracking-wider"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Registrati')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
              data-testid="auth-toggle-btn"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative" data-testid="auth-image-panel">
        <img
          src="https://images.pexels.com/photos/18435276/pexels-photo-18435276.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Sports center"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-blue-900/90 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h2 className="font-heading text-5xl font-bold mb-4 uppercase">SportCenter Pro</h2>
            <p className="text-xl text-white/90">Il tuo partner sportivo di fiducia</p>
          </div>
        </div>
      </div>
    </div>
  );
}