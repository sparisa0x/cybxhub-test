import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Megaphone, Plus, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Announcements() {
  const { profile } = useAuthStore();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', batch_id: '' });
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    fetchBatches();
    fetchAnnouncements();
  }, [profile]);

  const fetchBatches = async () => {
    let query = supabase.from('batches').select('id, name');
    if (profile?.role === 'trainer') query = query.eq('trainer_id', profile.id);
    const { data } = await query;
    setBatches(data || []);
    if (data && data.length > 0) setNewAnnouncement(prev => ({ ...prev, batch_id: data[0].id }));
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      let query = supabase.from('announcements').select('*, batches(name), users(name)');
      
      if (profile?.role === 'trainer') {
        const { data: trainerBatches } = await supabase.from('batches').select('id').eq('trainer_id', profile.id);
        const batchIds = trainerBatches?.map(b => b.id) || [];
        if (batchIds.length > 0) query = query.in('batch_id', batchIds);
        else { setAnnouncements([]); setLoading(false); return; }
      } else if (profile?.role === 'student') {
        const { data: enrollments } = await supabase.from('batch_students').select('batch_id').eq('student_id', profile.id);
        const batchIds = enrollments?.map(e => e.batch_id) || [];
        if (batchIds.length > 0) query = query.in('batch_id', batchIds);
        else { setAnnouncements([]); setLoading(false); return; }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('announcements').insert([
        { 
          title: newAnnouncement.title, 
          content: newAnnouncement.content, 
          batch_id: newAnnouncement.batch_id,
          created_by: profile?.id
        }
      ]).select('*, batches(name), users(name)');
      
      if (error) throw error;
      setAnnouncements([data[0], ...announcements]);
      setIsDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', batch_id: batches[0]?.id || '' });
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">Stay updated with the latest news.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post Announcement</DialogTitle>
                <DialogDescription>Broadcast a message to a specific batch.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAnnouncement}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="batch">Batch</Label>
                    <select 
                      id="batch" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newAnnouncement.batch_id} 
                      onChange={e => setNewAnnouncement({...newAnnouncement, batch_id: e.target.value})}
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
                    <Input id="title" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea id="content" className="min-h-[150px]" value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Post Announcement</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div>Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No announcements yet</p>
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{announcement.users?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <CardDescription>
                        {announcement.users?.name} • {announcement.batches?.name} • {formatDistanceToNow(new Date(announcement.created_at))} ago
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{announcement.content}</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Comment
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
