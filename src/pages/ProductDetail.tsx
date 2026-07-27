import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Star, Shield, Truck, Zap, Plus, CheckCircle2, Sparkles } from 'lucide-react';
import { CATALOG } from '@/data/products';
import { useCart } from '@/context/CartContext';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Cart from '@/components/Cart';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { addItem } = useCart();

  // Scroll to top whenever the product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const product = CATALOG.find(p => p.id === id);
  const others = CATALOG.filter(p => p.id !== id);

  if (!product) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <AnnouncementBar />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="font-serif text-2xl text-foreground">Produto não encontrado</p>
          <button
            onClick={() => setLocation('/')}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold hover:bg-primary/90 transition-all"
          >
            Voltar à loja
          </button>
        </div>
        <Cart />
      </div>
    );
  }

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden bg-background">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 w-full pb-24">

        {/* Back button */}
        <div className="px-4 pt-5 max-w-6xl mx-auto">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Voltar
          </button>
        </div>

        {/* ── Hero ── */}
        <section className="px-4 py-6 md:py-12 md:grid md:grid-cols-2 md:gap-16 md:items-start max-w-6xl mx-auto">

          {/* Image */}
          <motion.div
            key={`img-${product.id}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden shadow-sm border border-border/40">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            key={`info-${product.id}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
            className="mt-8 md:mt-0 flex flex-col"
          >
            {/* Category pill */}
            <span className="inline-flex self-start text-[11px] font-bold tracking-[0.18em] text-primary uppercase bg-primary/8 px-3 py-1 rounded-full mb-4 capitalize">
              {product.category}
            </span>

            {/* Stars */}
            <div className="flex items-center gap-1 mb-4 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
              <span className="text-muted-foreground text-sm ml-2 font-medium">
                4.8 <span className="opacity-60">(127 avaliações)</span>
              </span>
            </div>

            {/* Name */}
            <h1 className="text-2xl md:text-4xl font-serif text-foreground leading-[1.15] mb-4">
              {product.name}
            </h1>

            {/* Tagline */}
            <p className="text-base text-muted-foreground italic leading-relaxed mb-6 border-l-2 border-primary/40 pl-4">
              "{product.tagline}"
            </p>

            {/* Price */}
            <div className="flex items-end gap-3 mb-8">
              <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                boxShadow: [
                  '0px 0px 0px 0px rgba(200,121,112,0.4)',
                  '0px 0px 0px 14px rgba(200,121,112,0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              onClick={handleAdd}
              className="w-full bg-primary text-primary-foreground py-5 rounded-full font-bold text-lg mb-4 hover:bg-primary/90 shadow-xl shadow-primary/20 tracking-wide flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              ADICIONAR À SACOLA
            </motion.button>

            <button
              onClick={() => setLocation('/')}
              className="w-full border border-border text-foreground/70 py-4 rounded-full font-semibold text-sm hover:bg-muted transition-colors mb-10"
            >
              Ver produto principal
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-8 border-t border-border/50">
              {[
                { icon: Truck, label: 'Envio em 24h' },
                { icon: Shield, label: 'Troca Grátis' },
                { icon: Zap,    label: 'Qualidade' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center text-center text-xs text-foreground/70 gap-2.5 font-medium">
                  <div className="w-11 h-11 rounded-full bg-secondary/40 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Rich Description ── */}
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <div className="md:grid md:grid-cols-2 md:gap-12">

            {/* Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-secondary/25 rounded-3xl p-7 mb-6 md:mb-0"
            >
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
                  Por que você vai amar
                </span>
              </div>
              <ul className="space-y-4">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-foreground/85 leading-snug font-medium">
                      {h}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Full description */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col justify-center"
            >
              <h2 className="font-serif text-xl md:text-2xl text-foreground mb-4">
                Sobre o produto
              </h2>
              <p className="text-sm md:text-base text-foreground/70 leading-relaxed">
                {product.description}
              </p>

              {/* Mini add-to-cart repeat for easy reach */}
              <button
                onClick={handleAdd}
                className="mt-8 self-start flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                Adicionar à Sacola
              </button>
            </motion.div>

          </div>
        </section>

        {/* ── Other products ── */}
        {others.length > 0 && (
          <section className="px-4 py-12 border-t border-border/40 max-w-6xl mx-auto">
            <div className="mb-2">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
                Você também pode gostar
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-10">
              Outros produtos
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
              {others.map((other, i) => (
                <motion.div
                  key={other.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="group flex flex-col cursor-pointer"
                  onClick={() => setLocation(`/produto/${other.id}`)}
                >
                  <div className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden mb-3 relative shadow-sm">
                    <img
                      src={other.image}
                      alt={other.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ id: other.id, name: other.name, price: other.price, image: other.image, quantity: 1 });
                      }}
                      className="absolute bottom-3 right-3 w-10 h-10 bg-background/90 backdrop-blur-md rounded-full flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                      aria-label={`Adicionar ${other.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-[10px] font-bold px-2.5 py-1 rounded-full text-foreground/60 tracking-wide uppercase">
                      {other.category}
                    </span>
                  </div>
                  <p className="text-xs text-primary font-semibold mb-1 italic leading-tight line-clamp-1">
                    {other.tagline}
                  </p>
                  <h3 className="font-medium text-sm text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {other.name}
                  </h3>
                  <p className="text-primary font-bold text-base mt-auto">
                    R$ {other.price.toFixed(2).replace('.', ',')}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

      </main>

      <Cart />
    </div>
  );
}
