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
    </div>
  );
};

export default FloatingButtons;
