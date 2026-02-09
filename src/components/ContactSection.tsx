import { MapPin, Clock, Phone, Mail, Facebook } from 'lucide-react';

const ContactSection = () => {
  return (
    <section id="lien-he" className="section-padding">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Ghé thăm chúng tôi</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Liên Hệ Kim Linh
          </h2>
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-body font-semibold text-foreground">Vàng Bạc Kim Linh</p>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">
                    Số 50 Nguyễn Thị Minh Khai, phường Trường Sơn,
                    Sầm Sơn, Thanh Hóa
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-1">(Đối diện cổng phía Tây chợ Cột Đỏ)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-body font-semibold text-foreground">Giờ mở cửa</p>
                  <p className="text-sm text-muted-foreground font-body">T2 – CN: 8:00 – 17:00</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-body font-semibold text-foreground">Hotline / Zalo</p>
                  <a href="tel:0986617939" className="text-sm text-primary font-body hover:underline">098 661 7939</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-body font-semibold text-foreground">Email</p>
                  <a href="mailto:vangbacdaquykimlinh@gmail.com" className="text-sm text-primary font-body hover:underline break-all">
                    vangbacdaquykimlinh@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="tel:0986617939"
                className="flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-body font-medium hover:bg-primary/90 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Gọi ngay
              </a>
              <a
                href="https://zalo.me/0986617939"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-md bg-blue-500 text-primary-foreground font-body font-medium hover:bg-blue-600 transition-colors"
              >
                Chat Zalo
              </a>
              <a
                href="https://www.facebook.com/kimlinhjewelrys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-md border border-border text-foreground font-body font-medium hover:bg-secondary transition-colors"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </a>
              <a
                href="mailto:vangbacdaquykimlinh@gmail.com"
                className="flex items-center justify-center gap-2 py-3 rounded-md border border-border text-foreground font-body font-medium hover:bg-secondary transition-colors"
              >
                <Mail className="w-4 h-4" />
                Gửi Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
