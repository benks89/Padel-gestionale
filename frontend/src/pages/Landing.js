import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100" data-testid="landing-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-2xl tracking-tight">SPORTCENTER PRO</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Button 
                    onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')} 
                    variant="ghost"
                    data-testid="nav-dashboard-btn"
                  >
                    Dashboard
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="bg-primary text-primary-foreground hover:bg-blue-700 font-bold uppercase tracking-wider text-sm"
                  data-testid="nav-login-btn"
                >
                  Accedi
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 md:pb-32" data-testid="hero-section">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <h1 className="font-heading text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-6" data-testid="hero-title">
                GIOCA COME UN <span className="text-primary">PRO</span>
              </h1>
              <p className="text-lg leading-relaxed text-slate-600 mb-8">
                Prenota i nostri campi professionali di padel e calcio a 7. Sistema di prenotazione online semplice e veloce.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => user ? navigate('/booking') : navigate('/auth')} 
                  className="bg-primary text-primary-foreground hover:bg-blue-700 shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] hover:shadow-[0_6px_20px_rgba(0,118,255,0.23)] font-bold uppercase tracking-wider text-sm py-6 px-8"
                  data-testid="hero-cta-btn"
                >
                  Prenota Ora
                </Button>
                <Button 
                  onClick={() => navigate('/auth')} 
                  variant="outline"
                  className="bg-white border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 font-semibold py-6 px-8"
                  data-testid="hero-register-btn"
                >
                  Registrati
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img 
                    src="https://images.pexels.com/photos/33641987/pexels-photo-33641987.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
                    alt="Padel court" 
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1623583579527-dcea2a876454?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmb290YmFsbCUyMDctYS1zaWRlJTIwbWF0Y2glMjBncmFzc3xlbnwwfHx8fDE3NzE2Mjk4MzF8MA&ixlib=rb-4.1.0&q=85" 
                    alt="Soccer field" 
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
                <div className="space-y-4 pt-8">
                  <img 
                    src="https://images.pexels.com/photos/35248387/pexels-photo-35248387.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
                    alt="Indoor padel" 
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <img 
                    src="https://images.pexels.com/photos/29661256/pexels-photo-29661256.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
                    alt="Sports action" 
                    className="w-full h-64 object-cover rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-slate-50 to-white" data-testid="features-section">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 p-8 rounded-xl" data-testid="feature-card-padel">
              <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold tracking-normal mb-4">Padel Professionali</h3>
              <p className="text-slate-600 leading-relaxed">4 campi da padel con superfici di alta qualità e illuminazione professionale.</p>
            </div>
            <div className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 p-8 rounded-xl" data-testid="feature-card-soccer">
              <div className="w-12 h-12 bg-green-50 rounded-md flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold tracking-normal mb-4">Campo Calcio a 7</h3>
              <p className="text-slate-600 leading-relaxed">Erba sintetica di ultima generazione con standard FIFA.</p>
            </div>
            <div className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 p-8 rounded-xl" data-testid="feature-card-booking">
              <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold tracking-normal mb-4">Prenotazione Online</h3>
              <p className="text-slate-600 leading-relaxed">Sistema di prenotazione 24/7 con conferma immediata.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24" data-testid="courts-section">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <h2 className="text-4xl font-bold tracking-tight mb-12 text-center">I Nostri Campi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="court-card bg-white border border-slate-200 rounded-xl overflow-hidden group" data-testid="court-preview-padel">
              <div className="relative h-64">
                <img 
                  src="https://images.pexels.com/photos/35248387/pexels-photo-35248387.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
                  alt="Campi Padel" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div>
                    <h3 className="text-white text-2xl font-bold mb-2">Campi Padel</h3>
                    <p className="text-white/90 text-sm">4 campi disponibili • Slot 90 minuti</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <Button 
                  onClick={() => user ? navigate('/booking') : navigate('/auth')} 
                  className="w-full bg-primary hover:bg-blue-700 font-bold"
                  data-testid="book-padel-btn"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Prenota Padel
                </Button>
              </div>
            </div>
            <div className="court-card bg-white border border-slate-200 rounded-xl overflow-hidden group" data-testid="court-preview-soccer">
              <div className="relative h-64">
                <img 
                  src="https://images.unsplash.com/photo-1623583579527-dcea2a876454?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmb290YmFsbCUyMDctYS1zaWRlJTIwbWF0Y2glMjBncmFzc3xlbnwwfHx8fDE3NzE2Mjk4MzF8MA&ixlib=rb-4.1.0&q=85" 
                  alt="Campo Calcio" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div>
                    <h3 className="text-white text-2xl font-bold mb-2">Campo Calcio a 7</h3>
                    <p className="text-white/90 text-sm">1 campo disponibile • Slot 60 minuti</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <Button 
                  onClick={() => user ? navigate('/booking') : navigate('/auth')} 
                  className="w-full bg-accent hover:bg-green-600 font-bold"
                  data-testid="book-soccer-btn"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Prenota Calcio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 hero-bg" data-testid="cta-section">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl text-center">
          <h2 className="text-5xl md:text-6xl font-heading font-bold tracking-tight text-white mb-6">
            PRONTO A GIOCARE?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Registrati ora e prenota il tuo campo in pochi secondi
          </p>
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg"
            className="bg-white text-primary hover:bg-slate-100 shadow-xl font-bold uppercase tracking-wider py-6 px-12 text-base"
            data-testid="cta-register-btn"
          >
            Inizia Subito
          </Button>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-100" data-testid="footer">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl text-center">
          <p className="text-slate-600">© 2026 SportCenter Pro. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
}