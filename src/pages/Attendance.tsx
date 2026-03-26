import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export function Attendance() {
  const { profile } = useAuthStore();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, [profile]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let query = supabase.from('attendance').select('*, batches(name), users(name)');
      
      if (profile?.role === 'trainer') {
        const { data: trainerBatches } = await supabase.from('batches').select('id').eq('trainer_id', profile.id);
        const batchIds = trainerBatches?.map(b => b.id) || [];
        if (batchIds.length > 0) query = query.in('batch_id', batchIds);
        else { setAttendance([]); setLoading(false); return; }
      } else if (profile?.role === 'student') {
        query = query.eq('student_id', profile.id);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Track and manage batch attendance.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') && (
          <Button><CheckSquare className="mr-2 h-4 w-4" /> Mark Attendance</Button>
        )}
      </div>

      {loading ? (
        <div>Loading attendance records...</div>
      ) : attendance.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No attendance records found</p>
            <p className="text-sm text-muted-foreground">Attendance hasn't been marked yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>A list of recent attendance markings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-4 border-b bg-muted/50 p-4 font-medium text-sm">
                <div>Date</div>
                <div>Student</div>
                <div>Batch</div>
                <div>Status</div>
              </div>
              <div className="divide-y">
                {attendance.map((record) => (
                  <div key={record.id} className="grid grid-cols-4 items-center p-4 text-sm">
                    <div>{format(new Date(record.date), 'MMM d, yyyy')}</div>
                    <div>{record.users?.name}</div>
                    <div>{record.batches?.name}</div>
                    <div>
                      {record.status === 'present' ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                          <Check className="mr-1 h-3 w-3" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300">
                          <X className="mr-1 h-3 w-3" /> Absent
                        </span>
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
