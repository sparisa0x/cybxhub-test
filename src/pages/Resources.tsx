import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, ExternalLink, Search } from 'lucide-react';

export function Resources() {
  const { profile } = useAuthStore();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newResource, setNewResource] = useState({ title: '', url: '', category: '', difficulty: 'beginner', tags: '' });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tagsArray = newResource.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const { data, error } = await supabase.from('resources').insert([
        { 
          title: newResource.title, 
          url: newResource.url, 
          category: newResource.category,
          difficulty: newResource.difficulty,
          tags: tagsArray,
          created_by: profile?.id
        }
      ]).select();
      
      if (error) throw error;
      setResources([data[0], ...resources]);
      setIsDialogOpen(false);
      setNewResource({ title: '', url: '', category: '', difficulty: 'beginner', tags: '' });
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };

  const filteredResources = resources.filter(res => 
    res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Hub</h1>
          <p className="text-muted-foreground">Access learning materials and tools.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'trainer') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Link</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Resource Link</DialogTitle>
                  <DialogDescription>Share a useful link with the students.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateResource}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="url">URL</Label>
                      <Input id="url" type="url" value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Input id="category" placeholder="e.g. Web Sec, Network" value={newResource.category} onChange={e => setNewResource({...newResource, category: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <select 
                          id="difficulty" 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={newResource.difficulty} 
                          onChange={e => setNewResource({...newResource, difficulty: e.target.value})}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input id="tags" placeholder="e.g. xss, sql, tutorial" value={newResource.tags} onChange={e => setNewResource({...newResource, tags: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Resource</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div>Loading resources...</div>
      ) : filteredResources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No resources found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or add a new resource.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
                  <Badge variant={
                    resource.difficulty === 'beginner' ? 'default' : 
                    resource.difficulty === 'intermediate' ? 'secondary' : 'destructive'
                  }>
                    {resource.difficulty}
                  </Badge>
                </div>
                {resource.category && <CardDescription>{resource.category}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-1 mt-2">
                  {resource.tags?.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open Link
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
