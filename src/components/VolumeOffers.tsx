import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { motion } from 'framer-motion';
import { Check, ArrowUp, Sparkles, ChevronDown } from 'lucide-react';

const COLORS = [
  { id: 'amora', name: 'Amora', hex: '#6B2D3E' },
  { id: 'coral', name: 'Coral', hex: '#E8714A' },
  { id: 'rosa', name: 'Rosa Malvada', hex: '#E8608A' },
];

export default function VolumeOffers() {
  const { addItem, openCart } = useCart();

  const [color1, setColor1] = useState(COLORS[1]); // Default Coral
  const [color2, setColor2] = useState(COLORS[2]); // Default Rosa Malvada

  const scrollToTopForSingleStick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyCombo2 = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: `combo-2-${color1.id}-${color2.id}`,
      name: 'Combo 2 Bastões',
      color: `${color1.name} + ${color2.name}`,
      price: 169.90,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300',
    });
    openCart();
  };

  const handleBuyTrio = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: 'combo-3-trio',
      name: 'Combo Trio Perfeito',
      color: '1 Amora + 1 Coral + 1 Rosa Malvada',
      price: 229.90,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300',
    });
    openCart();
  };

  return (
    <section className="px-4 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif text-center mb-16 text-foreground">Escolha a sua oferta</h2>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {/* Card 1: 1 Bastão */}
          <div
            onClick={scrollToTopForSingleStick}
            className="border border-border/80 rounded-[2rem] p-8 cursor-pointer hover:border-primary transition-all bg-card shadow-sm hover:shadow-xl relative flex flex-col justify-between group"
          >
            <div>
              <h3 className="font-serif text-2xl mb-2 text-foreground group-hover:text-primary transition-colors">
                Leve 1 Bastão
              </h3>
              <p className="text-muted-foreground text-sm mb-6">Para testar e se apaixonar</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Selecione a cor no topo da página</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Blush, Batom e Sombra em 1 só stick</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-3xl font-bold mb-6 text-foreground">R$ 99,90</div>
              <button
                type="button"
                onClick={scrollToTopForSingleStick}
                className="w-full bg-secondary text-secondary-foreground py-4 rounded-full font-bold hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
              >
                <span>Escolher Cor no Topo</span>
                <ArrowUp className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>

          {/* Card 2: Leve 2 Bastões (Original size highlight card with clean color selectors) */}
          <motion.div
            whileHover={{ y: -8 }}
            className="border-2 border-primary rounded-[2rem] p-8 bg-primary/5 shadow-xl shadow-primary/10 relative transform md:-translate-y-4 flex flex-col justify-between"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap tracking-wide flex items-center gap-1.5 shadow-md uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              CAMPEÃO DE VENDAS
            </div>

            <div>
              <h3 className="font-serif text-2xl mb-1 text-primary">Leve 2 Bastões</h3>
              <p className="text-muted-foreground text-sm mb-4">Monte o kit perfeito para sua pele</p>

              <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-4 bg-primary/10 py-1 px-3 rounded-full w-fit">
                <Check className="w-3.5 h-3.5 text-primary" /> 15% de Desconto Incluso
              </div>

              {/* Clean Dropdown Selectors */}
              <div className="grid grid-cols-2 gap-2 my-4 bg-background/80 backdrop-blur-sm p-3 rounded-2xl border border-primary/20">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    1º Bastão
                  </label>
                  <div className="relative">
                    <select
                      value={color1.id}
                      onChange={(e) => {
                        const found = COLORS.find((c) => c.id === e.target.value);
                        if (found) setColor1(found);
                      }}
                      className="w-full appearance-none bg-card border border-border/80 rounded-xl py-2 px-2.5 pr-6 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                    >
                      {COLORS.map((c) => (
                        <option key={`c1-${c.id}`} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    2º Bastão
                  </label>
                  <div className="relative">
                    <select
                      value={color2.id}
                      onChange={(e) => {
                        const found = COLORS.find((c) => c.id === e.target.value);
                        if (found) setColor2(found);
                      }}
                      className="w-full appearance-none bg-card border border-border/80 rounded-xl py-2 px-2.5 pr-6 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                    >
                      {COLORS.map((c) => (
                        <option key={`c2-${c.id}`} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-3xl font-bold mb-6 text-primary flex items-baseline gap-2">
                R$ 169,90 <span className="text-base font-normal text-muted-foreground line-through">R$ 199,80</span>
              </div>
              <button
                type="button"
                onClick={handleBuyCombo2}
                className="w-full bg-primary text-primary-foreground py-4 rounded-full font-bold shadow-md hover:bg-primary/90 transition-all"
              >
                Adicionar à Sacola
              </button>
            </div>
          </motion.div>

          {/* Card 3: Trio Perfeito */}
          <div
            onClick={handleBuyTrio}
            className="border border-border/80 rounded-[2rem] p-8 cursor-pointer hover:border-foreground transition-all bg-card shadow-sm hover:shadow-xl relative flex flex-col justify-between group"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap tracking-wide uppercase">
              FRETE GRÁTIS
            </div>

            <div>
              <h3 className="font-serif text-2xl mb-2 text-foreground group-hover:text-primary transition-colors">
                Combo Trio Perfeito
              </h3>
              <p className="text-muted-foreground text-sm mb-6">As 3 cores essenciais juntas</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>23% de desconto exclusivo</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Frete Grátis incluso</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-3xl font-bold mb-6 text-foreground flex items-baseline gap-2">
                R$ 229,90 <span className="text-base font-normal text-muted-foreground line-through">R$ 299,70</span>
              </div>
              <button
                type="button"
                onClick={handleBuyTrio}
                className="w-full bg-foreground text-background py-4 rounded-full font-bold hover:bg-foreground/90 transition-all"
              >
                Adicionar à Sacola
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


