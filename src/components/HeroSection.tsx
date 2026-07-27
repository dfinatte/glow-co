import React, { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Star, Shield, Truck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/context/CartContext';

const IMAGES = [
  "https://drogal.vtexassets.com/arquivos/ids/258620-1200-900?v=638883562249770000&width=1200&height=900&aspect=true",
  "https://drogal.vtexassets.com/arquivos/ids/258624-1200-900?v=638883562259570000&width=1200&height=900&aspect=true",
  "https://drogal.vtexassets.com/arquivos/ids/258630-1200-900?v=638883562496500000&width=1200&height=900&aspect=true",
  "https://drogal.vtexassets.com/arquivos/ids/258632-1200-900?v=638883562505370000&width=1200&height=900&aspect=true",
];

const COLORS = [
  { id: 'amora', name: 'Amora', hex: '#6B2D3E' },
  { id: 'coral', name: 'Coral', hex: '#E8714A' },
  { id: 'rosa', name: 'Rosa Malvada', hex: '#E8608A' },
];

export default function HeroSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const { addItem } = useCart();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const handleBuy = () => {
    addItem({
      id: `bastao-${selectedColor.id}`,
      name: 'Bastão Multifuncional Ollie 3 em 1',
      color: selectedColor.name,
      price: 99.90,
      image: IMAGES[0]
    });
  };

  return (
    <section className="px-4 py-8 md:py-16 md:grid md:grid-cols-2 md:gap-16 md:items-start max-w-6xl mx-auto">
      {/* Left: Carousel */}
      <div className="w-full mx-auto">
        <div className="overflow-hidden rounded-2xl aspect-[4/5] bg-muted mb-4 relative shadow-sm border border-border/50" ref={emblaRef}>
          <div className="flex h-full touch-pan-y">
            {IMAGES.map((src, idx) => (
              <div className="flex-[0_0_100%] min-w-0 h-full relative" key={idx}>
                <img src={src} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {/* Dots for mobile */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 md:hidden">
            {IMAGES.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${idx === selectedIndex ? 'bg-primary w-6' : 'bg-white/70 shadow-sm'}`}
                onClick={() => emblaApi?.scrollTo(idx)}
              />
            ))}
          </div>
        </div>
        {/* Thumbnails for desktop */}
        <div className="hidden md:flex gap-4">
          {IMAGES.map((src, idx) => (
            <button 
              key={idx} 
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`relative rounded-xl overflow-hidden h-28 flex-1 border-2 transition-all ${idx === selectedIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={src} className="w-full h-full object-cover" alt="" />
            </button>
          ))}
        </div>
      </div>

      {/* Right: Info */}
      <div className="mt-8 md:mt-0 flex flex-col h-full">
        <div className="flex items-center gap-1 mb-4 text-amber-500">
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <span className="text-muted-foreground text-sm ml-2 font-medium tracking-wide">4.9 <span className="opacity-70">(847 avaliações)</span></span>
        </div>

        <h1 className="text-3xl md:text-5xl font-serif text-foreground leading-[1.1] mb-6">
          Bastão Multifuncional Ollie 3 em 1 (Blush, Batom e Sombra) — FPS 95
        </h1>

        <div className="flex items-end gap-3 mb-10">
          <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">R$ 99,90</span>
          <span className="text-muted-foreground line-through text-xl mb-1 opacity-70">R$ 149,90</span>
        </div>

        {/* Color Selector */}
        <div className="mb-10">
          <p className="text-sm font-medium mb-4 text-foreground/80 tracking-wide uppercase">Cor selecionada: <span className="font-bold text-primary">{selectedColor.name}</span></p>
          <div className="flex gap-4">
            {COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${selectedColor.id === color.id ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-110' : 'hover:scale-105 border-2 border-border/50'}`}
                style={{ backgroundColor: color.hex }}
                aria-label={`Selecionar cor ${color.name}`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          animate={{ boxShadow: ['0px 0px 0px 0px rgba(200, 121, 112, 0.4)', '0px 0px 0px 15px rgba(200, 121, 112, 0)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          onClick={handleBuy}
          className="w-full bg-primary text-primary-foreground py-5 rounded-full font-bold text-lg mb-8 hover:bg-primary/90 shadow-xl shadow-primary/20 tracking-wide"
        >
          COMPRAR AGORA
        </motion.button>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 pt-8 border-t border-border/60">
          <div className="flex flex-col items-center text-center text-xs text-foreground/80 gap-3 font-medium">
            <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <span>Envio em 24h</span>
          </div>
          <div className="flex flex-col items-center text-center text-xs text-foreground/80 gap-3 font-medium">
            <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <span>Troca Grátis</span>
          </div>
          <div className="flex flex-col items-center text-center text-xs text-foreground/80 gap-3 font-medium">
            <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <span>FPS 95 Real</span>
          </div>
        </div>
      </div>
    </section>
  );
}
