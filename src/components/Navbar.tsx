const Navbar = () => {
  return (
    <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
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
