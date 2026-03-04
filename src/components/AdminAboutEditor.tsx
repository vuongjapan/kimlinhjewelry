import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, GripVertical } from 'lucide-react';

type AboutSection = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type AboutImage = {
  id: string;
  section_id: string | null;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

const AdminAboutEditor = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editSection, setEditSection] = useState<AboutSection | null>(null);
  const [newSection, setNewSection] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['admin-about-sections'],
    queryFn: async () => {
      const { data } = await supabase.from('about_sections').select('*').order('sort_order');
      return (data || []) as AboutSection[];
    },
  });

  const { data: images } = useQuery({
    queryKey: ['admin-about-images'],
    queryFn: async () => {
      const { data } = await supabase.from('about_images').select('*').order('sort_order');
      return (data || []) as AboutImage[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-about-sections'] });
    qc.invalidateQueries({ queryKey: ['admin-about-images'] });
    qc.invalidateQueries({ queryKey: ['about-sections'] });
    qc.invalidateQueries({ queryKey: ['about-images'] });
  };

  const createSection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('about_sections').insert({
        title: newTitle,
        content: newContent,
        sort_order: (sections?.length || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Đã thêm mục mới' });
      setNewSection(false);
      setNewTitle('');
      setNewContent('');
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  const updateSection = useMutation({
    mutationFn: async (s: AboutSection) => {
      const { error } = await supabase.from('about_sections').update({ title: s.title, content: s.content, sort_order: s.sort_order }).eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Đã lưu' });
      setEditSection(null);
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('about_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Đã xóa' }); invalidate(); },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  const handleImageUpload = async (sectionId: string, file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${sectionId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('about-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('about-images').getPublicUrl(path);
      const { error } = await supabase.from('about_images').insert({
        section_id: sectionId,
        image_url: urlData.publicUrl,
        sort_order: 0,
      });
      if (error) throw error;
      toast({ title: 'Đã upload ảnh' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Lỗi upload', description: e.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const deleteImage = async (img: AboutImage) => {
    try {
      // Extract path from URL
      const url = new URL(img.image_url);
      const pathParts = url.pathname.split('/about-images/');
      if (pathParts[1]) {
        await supabase.storage.from('about-images').remove([decodeURIComponent(pathParts[1])]);
      }
      await supabase.from('about_images').delete().eq('id', img.id);
      toast({ title: 'Đã xóa ảnh' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Lỗi', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-center py-8">Đang tải...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-display font-semibold">Quản lý Giới thiệu</h2>
        <Button size="sm" onClick={() => setNewSection(true)}>
          <Plus className="w-4 h-4 mr-1" />Thêm mục
        </Button>
      </div>

      <div className="space-y-4">
        {sections?.map((section) => {
          const sectionImages = images?.filter((img) => img.section_id === section.id) || [];
          return (
            <div key={section.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-body font-semibold text-sm">{section.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{section.content}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setEditSection({ ...section })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm('Xóa mục này?')) deleteSection.mutate(section.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Images grid */}
              <div className="flex flex-wrap gap-2 mt-2">
                {sectionImages.map((img) => (
                  <div key={img.id} className="relative w-20 h-20 rounded-md overflow-hidden group bg-secondary/50">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { if (confirm('Xóa ảnh này?')) deleteImage(img); }}
                      className="absolute inset-0 bg-destructive/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 text-background" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(section.id, e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Section Dialog */}
      <Dialog open={!!editSection} onOpenChange={(open) => !open && setEditSection(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chỉnh sửa mục</DialogTitle></DialogHeader>
          {editSection && (
            <div className="space-y-4">
              <div>
                <Label className="font-body text-xs">Tiêu đề</Label>
                <Input value={editSection.title} onChange={(e) => setEditSection({ ...editSection, title: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-xs">Nội dung</Label>
                <Textarea rows={6} value={editSection.content} onChange={(e) => setEditSection({ ...editSection, content: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-xs">Thứ tự</Label>
                <Input type="number" value={editSection.sort_order} onChange={(e) => setEditSection({ ...editSection, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditSection(null)}>Hủy</Button>
                <Button onClick={() => updateSection.mutate(editSection)} disabled={updateSection.isPending}>Lưu</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Section Dialog */}
      <Dialog open={newSection} onOpenChange={setNewSection}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm mục giới thiệu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body text-xs">Tiêu đề</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div>
              <Label className="font-body text-xs">Nội dung</Label>
              <Textarea rows={6} value={newContent} onChange={(e) => setNewContent(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewSection(false)}>Hủy</Button>
              <Button onClick={() => createSection.mutate()} disabled={createSection.isPending || !newTitle}>Tạo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAboutEditor;
