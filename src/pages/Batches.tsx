import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus } from 'lucide-react';

export function Batches() {
  const { profile } = useAuthStore();
  const [batches, setBatches] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [studentRequests, setStudentRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', description: '', start_date: '' });

  useEffect(() => {
    fetchBatches();
  }, [profile]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let query = supabase.from('batches').select('*, trainer:users(name, id)');

      if (profile?.role === 'trainer') {
        query = query.eq('trainer_id', profile.id);
      } else if (profile?.role === 'student') {
        const { data: allBatches, error: allBatchesError } = await supabase
          .from('batches')
          .select('*, trainer:users(name, id)');
        if (allBatchesError) throw allBatchesError;

        const { data: enrollments } = await supabase.from('batch_students').select('batch_id').eq('student_id', profile.id);
        const enrolledBatchIds = new Set((enrollments || []).map(e => e.batch_id));

        const { data: requests, error: requestsError } = await supabase
          .from('batch_join_requests')
          .select('id, batch_id, status')
          .eq('student_id', profile.id);
        if (requestsError) throw requestsError;

        setStudentRequests(requests || []);
        setBatches((allBatches || []).filter(batch => enrolledBatchIds.has(batch.id)));
        setAvailableBatches((allBatches || []).filter(batch => !enrolledBatchIds.has(batch.id)));
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setBatches(data || []);

      if (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') {
        const { data: requestRows, error: requestError } = await supabase
          .from('batch_join_requests')
          .select('id, batch_id, student_id, status, created_at, batch:batches(id, name, trainer_id), student:users(id, name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (requestError) throw requestError;

        const filteredRequests = profile.role === 'trainer'
          ? (requestRows || []).filter((row: any) => row.batch?.trainer_id === profile.id)
          : (requestRows || []);

        setPendingRequests(filteredRequests);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (batchId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('batch_join_requests')
        .insert([{ batch_id: batchId, student_id: profile.id }]);

      if (error) throw error;
      await fetchBatches();
    } catch (error) {
      console.error('Error requesting batch join:', error);
    }
  };

  const handleReviewRequest = async (
    requestId: string,
    batchId: string,
    studentId: string,
    status: 'approved' | 'rejected'
  ) => {
    try {
      if (status === 'approved') {
        const { error: enrollmentError } = await supabase
          .from('batch_students')
          .upsert([{ batch_id: batchId, student_id: studentId }], { onConflict: 'batch_id,student_id' });

        if (enrollmentError) throw enrollmentError;
      }

      const { error: requestError } = await supabase
        .from('batch_join_requests')
        .update({ status })
        .eq('id', requestId);

      if (requestError) throw requestError;

      await fetchBatches();
    } catch (error) {
      console.error('Error reviewing batch join request:', error);
    }
  };

  const getStudentRequestStatus = (batchId: string) => {
    return studentRequests.find(request => request.batch_id === batchId)?.status;
  };

  const handleCreateBatch = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('batches').insert([
        { 
          name: newBatch.name, 
          description: newBatch.description, 
          start_date: newBatch.start_date,
          trainer_id: profile?.role === 'trainer' ? profile.id : null // Admins can assign later
        }
      ]).select();
      
      if (error) throw error;
      setBatches([...batches, data[0]]);
      setIsDialogOpen(false);
      setNewBatch({ name: '', description: '', start_date: '' });
    } catch (error) {
      console.error('Error creating batch:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">Manage your training cohorts.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Batch</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Batch</DialogTitle>
                <DialogDescription>Add a new training cohort to the platform.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBatch}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Batch Name</Label>
                    <Input id="name" value={newBatch.name} onChange={e => setNewBatch({...newBatch, name: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={newBatch.description} onChange={e => setNewBatch({...newBatch, description: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" value={newBatch.start_date} onChange={e => setNewBatch({...newBatch, start_date: e.target.value})} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Batch</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div>Loading batches...</div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No batches found</p>
            <p className="text-sm text-muted-foreground">You are not assigned to any batches yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <Card key={batch.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>{batch.name}</CardTitle>
                <CardDescription>Starts: {new Date(batch.start_date).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{batch.description}</p>
                {batch.trainer && (
                  <p className="text-xs font-medium mt-4">Trainer: {batch.trainer.name}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {profile?.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>Available Batches</CardTitle>
            <CardDescription>Request to join a batch after your account is approved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available batches to join right now.</p>
            ) : (
              availableBatches.map((batch) => {
                const requestStatus = getStudentRequestStatus(batch.id);
                return (
                  <div key={batch.id} className="flex items-center justify-between rounded-md border p-4">
                    <div>
                      <p className="font-medium">{batch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Starts: {new Date(batch.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={requestStatus === 'pending' ? 'secondary' : 'default'}
                      disabled={requestStatus === 'pending' || requestStatus === 'approved'}
                      onClick={() => handleRequestJoin(batch.id)}
                    >
                      {requestStatus === 'pending'
                        ? 'Requested'
                        : requestStatus === 'approved'
                          ? 'Approved'
                          : 'Request Join'}
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Join Requests</CardTitle>
            <CardDescription>Review student requests to join batches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              pendingRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <p className="font-medium">{request.student?.name || 'Student'}</p>
                    <p className="text-xs text-muted-foreground">{request.student?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Batch: {request.batch?.name || 'Unknown'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewRequest(request.id, request.batch_id, request.student_id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewRequest(request.id, request.batch_id, request.student_id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
