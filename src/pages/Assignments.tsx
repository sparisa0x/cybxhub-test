import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function Assignments() {
  const { profile } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', deadline: '', max_score: 100, batch_id: '' });
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    fetchAssignments();
    if (profile?.role === 'trainer' || profile?.role === 'admin' || profile?.role === 'super_admin') {
      fetchBatches();
    }
  }, [profile]);

  const fetchBatches = async () => {
    let query = supabase.from('batches').select('id, name');
    if (profile?.role === 'trainer') query = query.eq('trainer_id', profile.id);
    const { data } = await query;
    setBatches(data || []);
    if (data && data.length > 0) setNewAssignment(prev => ({ ...prev, batch_id: data[0].id }));
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let query = supabase.from('assignments').select('*, batches(name)');
      
      if (profile?.role === 'trainer') {
        // Trainers see assignments for their batches
        const { data: trainerBatches } = await supabase.from('batches').select('id').eq('trainer_id', profile.id);
        const batchIds = trainerBatches?.map(b => b.id) || [];
        if (batchIds.length > 0) query = query.in('batch_id', batchIds);
        else { setAssignments([]); setLoading(false); return; }
      } else if (profile?.role === 'student') {
        // Students see assignments for their enrolled batches
        const { data: enrollments } = await supabase.from('batch_students').select('batch_id').eq('student_id', profile.id);
        const batchIds = enrollments?.map(e => e.batch_id) || [];
        if (batchIds.length > 0) query = query.in('batch_id', batchIds);
        else { setAssignments([]); setLoading(false); return; }
      }

      const { data, error } = await query.order('deadline', { ascending: true });
      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('assignments').insert([
        { 
          title: newAssignment.title, 
          description: newAssignment.description, 
          deadline: new Date(newAssignment.deadline).toISOString(),
          max_score: newAssignment.max_score,
          batch_id: newAssignment.batch_id,
          created_by: profile?.id
        }
      ]).select('*, batches(name)');
      
      if (error) throw error;
      setAssignments([...assignments, data[0]]);
      setIsDialogOpen(false);
      setNewAssignment({ title: '', description: '', deadline: '', max_score: 100, batch_id: batches[0]?.id || '' });
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">Manage tasks and submissions.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>Assign a new task to a batch.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="batch">Batch</Label>
                    <select 
                      id="batch" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newAssignment.batch_id} 
                      onChange={e => setNewAssignment({...newAssignment, batch_id: e.target.value})}
                      required
                    >
                      <option value="" disabled>Select a batch</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input id="deadline" type="datetime-local" value={newAssignment.deadline} onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="max_score">Max Score</Label>
                      <Input id="max_score" type="number" min="1" value={newAssignment.max_score} onChange={e => setNewAssignment({...newAssignment, max_score: parseInt(e.target.value)})} required />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Assignment</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div>Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No assignments found</p>
            <p className="text-sm text-muted-foreground">You don't have any active assignments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const isPastDeadline = new Date(assignment.deadline) < new Date();
            return (
              <Card key={assignment.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg leading-tight">{assignment.title}</CardTitle>
                    {isPastDeadline ? (
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <CardDescription>Batch: {assignment.batches?.name}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{assignment.description}</p>
                  <div className="text-xs font-medium space-y-1">
                    <p className={isPastDeadline ? "text-destructive" : "text-primary"}>
                      Due: {format(new Date(assignment.deadline), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p>Max Score: {assignment.max_score}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    {profile?.role === 'student' ? 'Submit Work' : 'View Submissions'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
