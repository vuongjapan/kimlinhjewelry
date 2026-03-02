import { useAuth, getTierLabel, getTierColor } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
      {/* Auth bar */}
      <div className="border-b border-border/30 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-end gap-3 text-xs font-body">
          {loading ? (
            <span className="text-muted-foreground">Đang tải...</span>
          ) : user ? (
            <>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground font-medium truncate max-w-[150px]">
                  {profile?.full_name || user.email}
                </span>
                {profile && (
                  <Badge className={cn('text-[10px] px-1.5 py-0', getTierColor(profile.tier))}>
                    {getTierLabel(profile.tier)}
                  </Badge>
                )}
              </div>
              {isAdmin && (
                <a href="/admin" className="flex items-center gap-1 text-primary hover:underline">
                  <Shield className="w-3.5 h-3.5" />Admin
                </a>
              )}
              <button onClick={signOut} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <LogOut className="w-3.5 h-3.5" />Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/auth" className="text-primary font-medium hover:underline">Đăng nhập</a>
              <span className="text-muted-foreground">|</span>
              <a href="/auth" className="text-muted-foreground hover:text-foreground">Đăng ký</a>
            </div>
          )}
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="font-display font-semibold text-lg gold-text">
          Kim Linh Jewelry
        </a>
        <div className="hidden md:flex items-center gap-6">
          <a href="#gia-vang-the-gioi" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Giá vàng TG</a>
          <a href="#gia-vang" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Giá vàng VN</a>
          <a href="#gia-bac" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Giá bạc</a>
          <a href="#san-pham" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Sản phẩm</a>
          <a href="#kien-thuc" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Kiến thức</a>
          <a href="#lien-he" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Liên hệ</a>
        </div>
        <a href="tel:0986617939" className="md:hidden text-sm font-body text-primary font-medium">
          098 661 7939
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
