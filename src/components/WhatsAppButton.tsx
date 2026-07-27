import React from 'react';

export default function WhatsAppButton() {
  const phoneNumber = '5511999094158';
  const message = encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre meu pedido.');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 group active:scale-95 border-2 border-white/20"
      aria-label="Atendimento no WhatsApp"
      title="Atendimento WhatsApp (11) 99909-4158"
    >
      <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.687-.833-1.947-.928-.26-.095-.45-.143-.639.143-.19.285-.736.928-.902 1.118-.166.19-.333.214-.618.071-.285-.143-1.207-.445-2.299-1.419-.85-.758-1.424-1.694-1.591-1.98-.167-.285-.018-.439.125-.581.128-.128.285-.333.428-.5.143-.167.19-.285.285-.476.095-.19.048-.357-.024-.5-.071-.143-.639-1.541-.875-2.107-.23-.553-.464-.477-.639-.486-.166-.008-.357-.01-.547-.01-.19 0-.5.071-.761.357-.26.285.999 1.023.999 2.498 0 1.475 1.07 2.898 1.213 3.089.143.19 2.106 3.216 5.105 4.512.713.309 1.27.493 1.704.631.716.227 1.368.195 1.884.118.575-.086 1.767-.722 2.016-1.42.249-.698.249-1.296.174-1.42-.074-.124-.265-.195-.55-.338z" />
      </svg>
      <span className="hidden sm:inline font-bold text-xs tracking-wide">WhatsApp</span>
    </a>
  );
}
