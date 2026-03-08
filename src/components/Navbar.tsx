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

      {/* Main nav */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="font-display font-semibold text-lg text-foreground">
          Kim Linh Jewelry
        </a>
        <div className="hidden md:flex items-center gap-6">
          <a href="#gia-vang" className="text-sm font-body text-primary font-semibold hover:text-primary/80 transition-colors">Giá vàng</a>
          <a href="#gia-bac" className="text-sm font-body text-primary font-semibold hover:text-primary/80 transition-colors">Giá bạc</a>
          <a href="#gioi-thieu" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Giới thiệu</a>
          <a href="#gia-vang-the-gioi" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Giá vàng TG</a>
          <a href="#gia-bac-the-gioi" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Giá bạc TG</a>
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
