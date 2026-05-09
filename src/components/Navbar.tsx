import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navLinks = [
  { href: '#gia-vang', label: 'Giá Vàng Bạc tại Kim Linh', highlight: true },
  { href: '/lich-su-gia', label: '📊 Lịch Sử Giá', highlight: true, isRoute: true },
  { href: '#gia-bac', label: 'Giá bạc TH', highlight: true },
  { href: '#gia-vang-thuong-hieu', label: 'Vàng TH', highlight: true },
  { href: '#gioi-thieu', label: 'Giới thiệu' },
  { href: '#gia-vang-the-gioi', label: 'Giá vàng TG' },
  { href: '#gia-bac-the-gioi', label: 'Giá bạc TG' },
  { href: '#phan-tich', label: 'Phân tích AI', highlight: true },
  { href: '#san-pham', label: 'Sản phẩm' },
  { href: '#kien-thuc', label: 'Kiến thức' },
  { href: '#lien-he', label: 'Liên hệ' },
];

interface NavLinkItem {
  href: string;
  label: string;
  highlight?: boolean;
  isRoute?: boolean;
}

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const handleClick = (l: NavLinkItem) => (e: React.MouseEvent) => {
    setOpen(false);
    if (l.isRoute) return; // let <Link> handle it
    if (l.href.startsWith('#')) {
      if (!isHome) {
        e.preventDefault();
        navigate('/' + l.href);
      }
      // on home, default anchor jump works
    }
  };

  const renderLink = (l: NavLinkItem, className: string) => {
    if (l.isRoute) {
      return (
        <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className={className}>
          {l.label}
        </Link>
      );
    }
    const target = isHome ? l.href : '/' + l.href;
    return (
      <a key={l.href} href={target} onClick={handleClick(l)} className={className}>
        {l.label}
      </a>
    );
  };

  return (
    <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-display font-semibold text-lg text-foreground">
          Kim Linh Jewelry
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-5 flex-wrap">
          {navLinks.map((l) =>
            renderLink(
              l,
              `text-sm font-body transition-colors ${
                l.highlight
                  ? 'text-primary font-semibold hover:text-primary/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 -mr-2 text-foreground"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
            {navLinks.map((l) =>
              renderLink(
                l,
                `text-sm font-body py-1 transition-colors ${
                  l.highlight
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
