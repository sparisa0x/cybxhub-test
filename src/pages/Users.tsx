import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, CheckCircle, XCircle } from 'lucide-react';

export function Users() {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTrainer = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' } : u));
    } catch (error) {
      console.error('Error approving trainer:', error);
    }
  };

  if (profile?.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage platform users and permissions.</p>
        </div>
      </div>

      {loading ? (
        <div>Loading users...</div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>A list of all registered users on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-5 border-b bg-muted/50 p-4 font-medium text-sm">
                <div className="col-span-2">Name & Email</div>
                <div>Role</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y">
                {users.map((user) => (
                  <div key={user.id} className="grid grid-cols-5 items-center p-4 text-sm">
                    <div className="col-span-2">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </div>
                    <div>
                      <Badge variant={
                        user.status === 'active' ? 'default' : 
                        user.status === 'pending' ? 'secondary' : 'destructive'
                      } className="capitalize">
                        {user.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {user.role === 'trainer' && user.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleApproveTrainer(user.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
