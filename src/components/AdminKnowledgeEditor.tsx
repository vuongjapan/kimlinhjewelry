import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Bot, PenLine } from 'lucide-react';

type Article = {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  is_auto: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const AdminKnowledgeEditor = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [newArticle, setNewArticle] = useState(false);
  const [form, setForm] = useState({ title: '', summary: '', content: '' });

  const { data: articles, isLoading } = useQuery({
    queryKey: ['admin-knowledge-articles'],
    queryFn: async () => {
      const { data } = await supabase.from('knowledge_articles').select('*').order('sort_order');
      return (data || []) as Article[];
    },
  });

  const { data: autoSetting } = useQuery({
    queryKey: ['knowledge-auto-setting'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'knowledge_auto_update').single();
      return (data?.value as any)?.enabled ?? true;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-knowledge-articles'] });
    qc.invalidateQueries({ queryKey: ['knowledge-articles'] });
  };

  const toggleAutoUpdate = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from('site_settings').update({ value: { enabled } }).eq('key', 'knowledge_auto_update');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-auto-setting'] });
      toast({ title: autoSetting ? 'Đã tắt tự động cập nhật' : 'Đã bật tự động cập nhật' });
    },
  });

  const createArticle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('knowledge_articles').insert({
        title: form.title,
        summary: form.summary,
        content: form.content || null,
        sort_order: articles?.length || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Đã thêm bài viết' });
      setNewArticle(false);
      setForm({ title: '', summary: '', content: '' });
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  const updateArticle = useMutation({
    mutationFn: async (a: Article) => {
      const { error } = await supabase.from('knowledge_articles').update({
        title: a.title,
        summary: a.summary,
        content: a.content,
        is_published: a.is_published,
        is_auto: a.is_auto,
        sort_order: a.sort_order,
      }).eq('id', a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Đã lưu' });
      setEditArticle(null);
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Đã xóa' }); invalidate(); },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground text-center py-8">Đang tải...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl font-display font-semibold">Kiến thức đầu tư</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-body">
            <Switch
              checked={autoSetting ?? true}
              onCheckedChange={(v) => toggleAutoUpdate.mutate(v)}
            />
            <span className="text-muted-foreground">
              {autoSetting ? 'Tự động cập nhật' : 'Chỉnh sửa thủ công'}
            </span>
          </div>
          <Button size="sm" onClick={() => setNewArticle(true)}>
            <Plus className="w-4 h-4 mr-1" />Thêm bài
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {articles?.map((article) => (
          <div key={article.id} className="glass-card p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-body font-semibold text-sm truncate">{article.title}</h3>
                {article.is_auto && (
                  <Badge variant="outline" className="text-[10px] gap-1"><Bot className="w-3 h-3" />Tự động</Badge>
                )}
                {!article.is_published && (
                  <Badge variant="secondary" className="text-[10px]">Ẩn</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setEditArticle({ ...article })}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm('Xóa bài viết này?')) deleteArticle.mutate(article.id); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(!articles || articles.length === 0) && (
          <p className="text-muted-foreground text-sm text-center py-8">Chưa có bài viết nào</p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editArticle} onOpenChange={(open) => !open && setEditArticle(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chỉnh sửa bài viết</DialogTitle></DialogHeader>
          {editArticle && (
            <div className="space-y-4">
              <div>
                <Label className="font-body text-xs">Tiêu đề</Label>
                <Input value={editArticle.title} onChange={(e) => setEditArticle({ ...editArticle, title: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-xs">Tóm tắt</Label>
                <Textarea rows={3} value={editArticle.summary} onChange={(e) => setEditArticle({ ...editArticle, summary: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-xs">Nội dung chi tiết (tùy chọn)</Label>
                <Textarea rows={5} value={editArticle.content || ''} onChange={(e) => setEditArticle({ ...editArticle, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                  <input type="checkbox" checked={editArticle.is_published} onChange={(e) => setEditArticle({ ...editArticle, is_published: e.target.checked })} />
                  Hiển thị
                </label>
                <div>
                  <Label className="font-body text-xs">Thứ tự</Label>
                  <Input type="number" className="w-20" value={editArticle.sort_order} onChange={(e) => setEditArticle({ ...editArticle, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditArticle(null)}>Hủy</Button>
                <Button onClick={() => updateArticle.mutate(editArticle)} disabled={updateArticle.isPending}>Lưu</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Dialog */}
      <Dialog open={newArticle} onOpenChange={setNewArticle}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm bài viết mới</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body text-xs">Tiêu đề</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="font-body text-xs">Tóm tắt</Label>
              <Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div>
              <Label className="font-body text-xs">Nội dung chi tiết (tùy chọn)</Label>
              <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewArticle(false)}>Hủy</Button>
              <Button onClick={() => createArticle.mutate()} disabled={createArticle.isPending || !form.title || !form.summary}>Tạo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKnowledgeEditor;
