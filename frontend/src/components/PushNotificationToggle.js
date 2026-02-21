import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  isPushSupported,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  registerServiceWorker
} from '@/utils/pushNotifications';

export default function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    const supported = isPushSupported() && isNotificationSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(getNotificationPermission());
      const subscribed = await isPushSubscribed();
      setIsSubscribed(subscribed);
    }
    setLoading(false);
  };

  const handleToggle = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Devi effettuare il login');
      return;
    }

    setLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        await unsubscribeFromPush(token);
        setIsSubscribed(false);
        toast.success('Notifiche push disattivate');
      } else {
        // First register service worker
        await registerServiceWorker();
        
        // Request permission if needed
        if (permission !== 'granted') {
          const newPermission = await requestNotificationPermission();
          setPermission(newPermission);
          
          if (newPermission !== 'granted') {
            toast.error('Permesso notifiche negato');
            setLoading(false);
            return;
          }
        }

        // Subscribe to push
        const subscription = await subscribeToPush(token);
        if (subscription) {
          setIsSubscribed(true);
          toast.success('Notifiche push attivate! Riceverai avvisi anche quando l\'app è chiusa.');
        } else {
          toast.error('Errore nell\'attivazione delle notifiche');
        }
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      toast.error('Errore nella gestione delle notifiche');
    }

    setLoading(false);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <BellOff className="w-4 h-4" />
        <span>Push non supportato</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <X className="w-4 h-4" />
        <span>Notifiche bloccate dal browser</span>
      </div>
    );
  }

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2"
      data-testid="push-toggle-btn"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isSubscribed ? (
        <>
          <Smartphone className="w-4 h-4" />
          <Check className="w-3 h-3" />
          Push Attive
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Attiva Push
        </>
      )}
    </Button>
  );
}
