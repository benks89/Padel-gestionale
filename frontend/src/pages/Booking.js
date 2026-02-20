import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    if (selectedCourt && selectedDate) {
      fetchAvailability();
    }
  }, [selectedCourt, selectedDate]);

  const fetchCourts = async () => {
    try {
      const response = await axios.get(`${API_URL}/courts`);
      setCourts(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei campi');
    }
  };

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.get(`${API_URL}/bookings/availability`, {
        params: { court_id: selectedCourt.id, data: dateStr }
      });
      setAvailableSlots(response.data.slots);
    } catch (error) {
      toast.error('Errore nel caricamento degli slot');
    } finally {
      setLoading(false);
    }
  };

  const handleCourtSelect = (court) => {
    setSelectedCourt(court);
    setStep(2);
  };

  const handleSlotSelect = (slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setStep(4);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await axios.post(`${API_URL}/bookings`, {
        court_id: selectedCourt.id,
        data: dateStr,
        ora_inizio: selectedSlot.ora_inizio
      });
      toast.success('Prenotazione confermata!');
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella prenotazione');
    } finally {
      setLoading(false);
    }
  };

  const courtImages = {
    padel: 'https://images.pexels.com/photos/35248387/pexels-photo-35248387.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    calcio: 'https://images.unsplash.com/photo-1623583579527-dcea2a876454?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmb290YmFsbCUyMDctYS1zaWRlJTIwbWF0Y2glMjBncmFzc3xlbnwwfHx8fDE3NzE2Mjk4MzF8MA&ixlib=rb-4.1.0&q=85'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200" data-testid="booking-nav">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <Button 
              variant="ghost" 
              onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-heading font-bold text-xl">Nuova Prenotazione</span>
            </div>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8 max-w-5xl py-12">
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-200'}`}>1</div>
              <span className="font-medium hidden sm:inline">Scegli Campo</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-200'}`}>2</div>
              <span className="font-medium hidden sm:inline">Data e Ora</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200"></div>
            <div className={`flex items-center gap-2 ${step >= 4 ? 'text-primary' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 4 ? 'bg-primary text-white' : 'bg-slate-200'}`}>3</div>
              <span className="font-medium hidden sm:inline">Conferma</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <div data-testid="court-selection-step">
            <h2 className="text-3xl font-heading font-bold mb-8 text-center">Seleziona il Campo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courts.map((court) => (
                <button
                  key={court.id}
                  onClick={() => handleCourtSelect(court)}
                  className="court-card bg-white border-2 border-slate-200 hover:border-primary rounded-xl overflow-hidden text-left group"
                  data-testid={`select-court-${court.id}`}
                >
                  <div className="relative h-48">
                    <img 
                      src={courtImages[court.tipo]} 
                      alt={court.nome}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-white text-2xl font-bold">{court.nome}</h3>
                      <p className="text-white/90 text-sm">
                        {court.tipo === 'padel' ? 'Slot: 90 minuti' : 'Slot: 60 minuti'}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                      court.tipo === 'padel' ? 'bg-blue-50 text-primary' : 'bg-green-50 text-accent'
                    }`}>
                      {court.tipo === 'padel' ? 'Padel' : 'Calcio a 7'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div data-testid="datetime-selection-step">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-heading font-bold mb-2">Seleziona Data e Ora</h2>
              <p className="text-slate-600">Campo selezionato: <strong>{selectedCourt.nome}</strong></p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-8 mb-8">
              <h3 className="text-lg font-semibold mb-4">Scegli la Data</h3>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setStep(3);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={it}
                  className="rounded-md border"
                  data-testid="date-picker"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && selectedDate && (
          <div data-testid="slot-selection-step">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-heading font-bold mb-2">Scegli l'Orario</h2>
              <p className="text-slate-600">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-8">
              {loading ? (
                <div className="text-center py-8">Caricamento slot...</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.ora_inizio}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={!slot.available}
                      className={`slot-button py-3 px-2 rounded-md text-sm font-medium transition-all ${
                        slot.available
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                      data-testid={`slot-${slot.ora_inizio}`}
                    >
                      {slot.ora_inizio}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-slate-200 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span className="text-slate-600">Disponibile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 rounded"></div>
                  <span className="text-slate-600">Prenotato</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div data-testid="confirmation-step">
            <div className="text-center mb-8">
              <CheckCircle2 className="w-16 h-16 text-accent mx-auto mb-4" />
              <h2 className="text-3xl font-heading font-bold mb-2">Conferma Prenotazione</h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md mx-auto">
              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600">Campo:</span>
                  <span className="font-semibold">{selectedCourt.nome}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600">Tipo:</span>
                  <span className="font-semibold">{selectedCourt.tipo === 'padel' ? 'Padel' : 'Calcio a 7'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600">Data:</span>
                  <span className="font-semibold">{format(selectedDate, 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600">Orario:</span>
                  <span className="font-semibold">{selectedSlot.ora_inizio} - {selectedSlot.ora_fine}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                  data-testid="cancel-booking-btn"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  className="flex-1 bg-accent hover:bg-green-600 font-bold"
                  data-testid="confirm-booking-btn"
                >
                  {loading ? 'Prenotazione...' : 'Conferma'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
