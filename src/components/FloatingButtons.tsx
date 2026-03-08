import { Phone, MessageCircle } from 'lucide-react';

const FloatingButtons = () => {
  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-3">
      <a
        href="tel:0986617939"
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg animate-pulse-gold hover:scale-110 transition-transform"
        aria-label="Gọi điện"
      >
        <Phone className="w-5 h-5" />
      </a>
      <a
        href="https://zalo.me/0986617939"
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full bg-blue-500 text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Chat Zalo"
      >
        <MessageCircle className="w-5 h-5" />
      </a>
      <a
        href="https://m.me/kimlinhjewelrys"
        target="_blank"
        rel="noopener noreferrer"
        className="group w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(270,80%,60%)] via-[hsl(320,80%,55%)] to-[hsl(30,90%,55%)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform animate-bounce-slow"
        aria-label="Chat Facebook Messenger"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.18.16.15.26.36.27.58l.05 1.82c.02.56.6.93 1.11.7l2.04-.8c.18-.07.38-.08.56-.03.86.24 1.78.36 2.82.36 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm5.89 7.58l-2.88 4.57a1.5 1.5 0 0 1-2.17.4l-2.29-1.72a.6.6 0 0 0-.72 0l-3.09 2.34c-.41.31-.95-.18-.68-.62l2.88-4.57a1.5 1.5 0 0 1 2.17-.4l2.29 1.72a.6.6 0 0 0 .72 0l3.09-2.34c.41-.31.95.18.68.62z"/>
        </svg>
      </a>
      <a
        href="https://www.agoda.com/vi-vn/tuan-dat-luxury-hotel-flc/hotel/thanh-hoa-sam-son-beach-vn.html?cid=1844104&ds=eOSBCifZS4w0QBRo"
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(210,90%,45%)] to-[hsl(190,85%,40%)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Đặt phòng Agoda"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </a>
    </div>
  );
};

export default FloatingButtons;
