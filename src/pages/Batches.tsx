import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', description: '', start_date: '' });

  useEffect(() => {
    fetchBatches();
  }, [profile]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let query = supabase.from('batches').select('*, trainer:users(name)');
      
      if (profile?.role === 'trainer') {
        query = query.eq('trainer_id', profile.id);
      } else if (profile?.role === 'student') {
        // Students see batches they are enrolled in
        const { data: enrollments } = await supabase.from('batch_students').select('batch_id').eq('student_id', profile.id);
        const batchIds = enrollments?.map(e => e.batch_id) || [];
        if (batchIds.length > 0) {
          query = query.in('id', batchIds);
        } else {
          setBatches([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
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
        {(profile?.role === 'admin' || profile?.role === 'trainer') && (
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
    </div>
  );
}
