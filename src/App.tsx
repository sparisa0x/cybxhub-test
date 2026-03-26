/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { PendingApproval } from '@/pages/PendingApproval';
import { Dashboard } from '@/pages/Dashboard';
import { Batches } from '@/pages/Batches';
import { Resources } from '@/pages/Resources';
import { Assignments } from '@/pages/Assignments';
import { Attendance } from '@/pages/Attendance';
import { Announcements } from '@/pages/Announcements';
import { Users } from '@/pages/Users';
import { Settings } from '@/pages/Settings';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactElement;
  allowedRoles?: Array<'admin' | 'super_admin' | 'trainer' | 'student'>;
}) {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.status === 'pending' || profile.status === 'suspended') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { setUser, fetchProfile, isLoading } = useAuthStore();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        useAuthStore.setState({ isLoading: false });
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        useAuthStore.setState({ profile: null, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, fetchProfile]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="batches" element={<Batches />} />
          <Route path="resources" element={<Resources />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['super_admin']}><Users /></ProtectedRoute>} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

