import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileText, 
  CheckSquare, 
  Megaphone,
  Settings
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function Sidebar() {
  const location = useLocation();
  const { profile } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'trainer', 'student'] },
    { name: 'Batches', href: '/batches', icon: Users, roles: ['admin', 'super_admin', 'trainer', 'student'] },
    { name: 'Resources', href: '/resources', icon: BookOpen, roles: ['admin', 'super_admin', 'trainer', 'student'] },
    { name: 'Assignments', href: '/assignments', icon: FileText, roles: ['admin', 'super_admin', 'trainer', 'student'] },
    { name: 'Attendance', href: '/attendance', icon: CheckSquare, roles: ['admin', 'super_admin', 'trainer', 'student'] },
    { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['admin', 'super_admin', 'trainer', 'student'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin', 'super_admin'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'super_admin', 'trainer', 'student'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold tracking-tight">Cybxhub</span>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
