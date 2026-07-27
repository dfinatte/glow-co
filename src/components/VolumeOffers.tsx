import { useCart } from '@/context/CartContext';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function VolumeOffers() {
  const { addItem } = useCart();

  const handleBuy = (type: number) => {
    if (type === 1) {
      addItem({ id: 'bastao-coral-1', name: 'Bastão Multifuncional Ollie', color: 'Coral', price: 99.90, quantity: 1, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' });
    } else if (type === 2) {
      addItem({ id: 'combo-2', name: 'Combo 2 Bastões', price: 169.90, quantity: 1, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' });
    } else {
      addItem({ id: 'combo-3', name: 'Trio Perfeito', price: 229.90, quantity: 1, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' });
    }
  };

  return (
    <section className="px-4 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif text-center mb-16 text-foreground">Escolha a sua oferta</h2>
        
        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Card 1 */}
          <div onClick={() => handleBuy(1)} className="border border-border/80 rounded-[2rem] p-8 cursor-pointer hover:border-primary transition-all bg-card shadow-sm hover:shadow-xl relative md:h-[400px] flex flex-col">
            <h3 className="font-serif text-2xl mb-2">Leve 1 Bastão</h3>
            <p className="text-muted-foreground text-sm mb-6">Para testar e se apaixonar</p>
            
            <div className="flex items-center gap-2 mb-2 text-sm text-foreground/80">
               <Check className="w-4 h-4 text-green-500" /> Cor à escolha
            </div>
            
            <div className="mt-auto">
              <div className="text-3xl font-bold mb-6 text-foreground">R$ 99,90</div>
              <button className="w-full bg-secondary text-secondary-foreground py-4 rounded-full font-bold hover:bg-secondary/80 transition-colors">Adicionar à Sacola</button>
            </div>
          </div>

          {/* Card 2 - Highlight */}
          <motion.div whileHover={{ y: -8 }} onClick={() => handleBuy(2)} className="border-2 border-primary rounded-[2rem] p-8 cursor-pointer bg-primary/5 shadow-xl shadow-primary/10 relative transform md:-translate-y-4 md:h-[430px] flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap tracking-wide">
              CAMPEÃO DE VENDAS
            </div>
            <h3 className="font-serif text-2xl mb-2 text-primary">Leve 2 Bastões</h3>
            <p className="text-muted-foreground text-sm mb-6">Monte o kit perfeito para sua pele</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                 <Check className="w-4 h-4 text-primary" /> 15% de desconto
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                 <Check className="w-4 h-4 text-primary" /> Cores à escolha no carrinho
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-3xl font-bold mb-6 text-primary flex items-baseline gap-2">
                R$ 169,90 <span className="text-base font-normal text-muted-foreground line-through">R$ 199,80</span>
              </div>
              <button className="w-full bg-primary text-primary-foreground py-4 rounded-full font-bold shadow-md hover:bg-primary/90 transition-colors">Adicionar à Sacola</button>
            </div>
          </motion.div>

          {/* Card 3 */}
          <div onClick={() => handleBuy(3)} className="border border-border/80 rounded-[2rem] p-8 cursor-pointer hover:border-foreground transition-all bg-card shadow-sm hover:shadow-xl relative md:h-[400px] flex flex-col">
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap tracking-wide">
              FRETE GRÁTIS
            </div>
            <h3 className="font-serif text-2xl mb-2">Combo Trio Perfeito</h3>
            <p className="text-muted-foreground text-sm mb-6">As 3 cores essenciais juntas</p>
            
            <div className="space-y-2 mb-6">
               <div className="flex items-center gap-2 text-sm text-foreground/80">
                 <Check className="w-4 h-4 text-green-500" /> 23% de desconto
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                 <Check className="w-4 h-4 text-green-500" /> Frete Grátis incluso
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-3xl font-bold mb-6 text-foreground flex items-baseline gap-2">
                R$ 229,90 <span className="text-base font-normal text-muted-foreground line-through">R$ 299,70</span>
              </div>
              <button className="w-full bg-foreground text-background py-4 rounded-full font-bold hover:bg-foreground/90 transition-colors">Adicionar à Sacola</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
