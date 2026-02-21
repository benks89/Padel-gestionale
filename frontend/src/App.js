import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import UserDashboard from '@/pages/UserDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminCalendar from '@/pages/AdminCalendar';
import AdminManagement from '@/pages/AdminManagement';
import AdminUsers from '@/pages/AdminUsers';
import ActivityLogs from '@/pages/ActivityLogs';
import Booking from '@/pages/Booking';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import '@/App.css';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/calendar" 
            element={
              <ProtectedRoute adminOnly>
                <AdminCalendar />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/management" 
            element={
              <ProtectedRoute adminOnly>
                <AdminManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/logs" 
            element={
              <ProtectedRoute adminOnly>
                <ActivityLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/booking" 
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            } 
          />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;