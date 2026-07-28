import { useCart } from '@/context/CartContext';
import { Plus } from 'lucide-react';
import { CATALOG } from '@/data/products';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

export default function CrossSell() {
  const { addItem } = useCart();
  const [, setLocation] = useLocation();

  return (
    <section className="px-4 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center md:text-left mb-3">
          <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Completam seu kit</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-12 text-center md:text-left">
          Aproveite Também
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {CATALOG.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group flex flex-col"
            >
              {/* Clickable image → product page */}
              <div
                className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden mb-4 relative shadow-sm cursor-pointer"
                onClick={() => setLocation(`/produto/${product.id}`)}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* Quick-add stays independent */}
                <button
                  onClick={e => { e.stopPropagation(); addItem({ ...product, quantity: 1 }); }}
                  className="absolute bottom-3 right-3 w-11 h-11 bg-background/90 backdrop-blur-md rounded-full flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                  aria-label={`Adicionar ${product.name} à Sacola`}
                >
                  <Plus className="w-5 h-5" />
                </button>
                <span className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full text-foreground/70 tracking-wide capitalize">
                  {product.category}
                </span>
              </div>

              {/* Clickable name → product page */}
              <h3
                className="font-medium text-sm md:text-base text-foreground leading-snug mb-2 pr-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setLocation(`/produto/${product.id}`)}
              >
                {product.name}
              </h3>

              <div className="flex items-center justify-between mt-auto pt-2 gap-2">
                <p className="text-primary font-bold text-base md:text-lg">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setLocation(`/produto/${product.id}`)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver detalhes
                  </button>
                  <button
                    onClick={() => addItem({ ...product, quantity: 1 })}
                    className="text-xs font-semibold text-primary hover:underline underline-offset-2"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
