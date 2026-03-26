import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuthStore } from '@/store/authStore';

export function AppLayout() {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.status === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
