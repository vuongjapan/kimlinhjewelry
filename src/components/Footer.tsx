const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="font-display font-semibold text-lg gold-text mb-2">Kim Linh Jewelry</p>
          <p className="text-sm text-muted-foreground font-body mb-1">
            Số 50 Nguyễn Thị Minh Khai, P. Trường Sơn, Sầm Sơn, Thanh Hóa
          </p>
          <p className="text-sm text-muted-foreground font-body mb-4">
            Hotline: 098 661 7939 • Email: vangbacdaquykimlinh@gmail.com
          </p>
          <div className="flex justify-center gap-4 mb-4">
            <a href="https://www.facebook.com/kimlinhjewelrys" target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-body hover:underline">Facebook</a>
            <a href="https://zalo.me/0986617939" target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-body hover:underline">Zalo</a>
          </div>
          <p className="text-xs text-muted-foreground font-body">
            © {new Date().getFullYear()} Vàng Bạc Kim Linh. Giá vàng mang tính tham khảo.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
