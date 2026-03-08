import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '#gia-vang', label: 'Giá vàng', highlight: true },
  { href: '#gia-bac', label: 'Giá bạc', highlight: true },
  { href: '#gia-vang-thuong-hieu', label: 'Vàng TH', highlight: true },
  { href: '#gioi-thieu', label: 'Giới thiệu' },
  { href: '#gia-vang-the-gioi', label: 'Giá vàng TG' },
  { href: '#gia-bac-the-gioi', label: 'Giá bạc TG' },
  { href: '#san-pham', label: 'Sản phẩm' },
  { href: '#kien-thuc', label: 'Kiến thức' },
  { href: '#lien-he', label: 'Liên hệ' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="font-display font-semibold text-lg text-foreground">
          Kim Linh Jewelry
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-body transition-colors ${
                l.highlight
                  ? 'text-primary font-semibold hover:text-primary/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 text-foreground"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`text-sm font-body py-1 transition-colors ${
                  l.highlight
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
