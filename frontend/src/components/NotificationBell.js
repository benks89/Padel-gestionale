import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, CheckCheck, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/notifications/unread-count`);
      setUnreadCount(res.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/notifications?limit=20`);
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/admin/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/admin/notifications/read-all`);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return format(date, 'd MMM', { locale: it });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="relative"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
          data-testid="notification-dropdown"
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <span className="font-semibold">Notifiche</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">{unreadCount} nuove</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80"
                data-testid="mark-all-read"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Segna tutte lette
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Caricamento...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Nessuna notifica
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notif.is_read ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    data-testid={`notification-${notif.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notif.is_admin_action ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                        {notif.is_admin_action ? (
                          <User className={`w-5 h-5 ${notif.is_admin_action ? 'text-purple-600' : 'text-green-600'}`} />
                        ) : (
                          <Calendar className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                            {notif.title}
                          </span>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {formatTime(notif.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                        {!notif.is_read && (
                          <div className="flex items-center gap-1 mt-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-blue-600">Non letta</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
