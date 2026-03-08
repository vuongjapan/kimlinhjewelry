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
    </div>
  );
};

export default FloatingButtons;
