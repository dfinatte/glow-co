import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLocation } from 'wouter';
import { CATALOG } from '@/data/products';

export default function Cart() {
  const { cartItems, isCartOpen, closeCart, removeItem, updateQuantity, cartTotal, addItem } = useCart();
  const [, setLocation] = useLocation();

  const progressToFreeShipping = Math.min(100, (cartTotal / 200) * 100);
  const remainingForFreeShipping = Math.max(0, 200 - cartTotal);

  const handleCheckout = () => {
    closeCart();
    setLocation('/checkout');
  };

  // Suggest up to 3 catalog products not already in the cart
  const cartIds = new Set(cartItems.map(i => i.id));
  const suggestions = CATALOG.filter(p => !cartIds.has(p.id)).slice(0, 3);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-background z-50 flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-border flex items-center justify-between bg-background">
              <h2 className="font-serif text-2xl flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-primary" />
                Sua Sacola
              </h2>
              <button onClick={closeCart} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            {cartItems.length > 0 ? (
              <>
                <div className="bg-secondary/20 p-5 border-b border-border text-sm">
                  {remainingForFreeShipping > 0 ? (
                    <p className="text-center mb-3 text-foreground/80">
                      Faltam{' '}
                      <span className="font-bold text-foreground">
                        R$ {remainingForFreeShipping.toFixed(2).replace('.', ',')}
                      </span>{' '}
                      para frete grátis
                    </p>
                  ) : (
                    <p className="text-center font-bold text-green-600 mb-3 flex items-center justify-center gap-2">
                      Frete grátis desbloqueado!
                    </p>
                  )}
                  <div className="h-2.5 w-full bg-border/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToFreeShipping}%` }}
                      className={`h-full transition-all duration-500 ${progressToFreeShipping === 100 ? 'bg-green-500' : 'bg-primary'}`}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Cart items */}
                  <div className="p-5 space-y-5">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
                        <div className="w-24 h-28 bg-muted rounded-xl overflow-hidden shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-medium text-sm text-foreground/90 leading-tight line-clamp-2">{item.name}</h3>
                              <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {item.color && (
                              <p className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider font-semibold">{item.color}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border border-border rounded-full bg-background shadow-sm">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:text-primary transition-colors">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:text-primary transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="font-bold text-foreground">
                              R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="px-5 pb-6">
                      <div className="border-t border-border/60 pt-5">
                        <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                          Complete seu pedido
                        </p>
                        <div className="space-y-3">
                          {suggestions.map(product => (
                            <div key={product.id} className="flex items-center gap-3 bg-secondary/20 rounded-xl p-3">
                              <div
                                className="w-14 h-14 bg-muted rounded-xl overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  closeCart();
                                  setLocation(`/produto/${product.id}`);
                                }}
                              >
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              </div>
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  closeCart();
                                  setLocation(`/produto/${product.id}`);
                                }}
                              >
                                <p className="text-xs font-medium text-foreground leading-tight line-clamp-2 hover:text-primary transition-colors">
                                  {product.name}
                                </p>
                                <p className="text-primary font-bold text-sm mt-1">
                                  R$ {product.price.toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                              <button
                                onClick={() => addItem({ ...product, quantity: 1 })}
                                className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                aria-label={`Adicionar ${product.name}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border bg-background/95 backdrop-blur-md">
                  <div className="space-y-3 mb-6 text-sm text-foreground/70">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frete</span>
                      <span className="font-medium text-green-600">
                        {progressToFreeShipping === 100 ? 'Grátis' : 'Calculado no checkout'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-4 border-t border-border">
                    <span className="font-serif text-lg">Total</span>
                    <span className="font-bold text-3xl text-foreground">
                      R$ {cartTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-full font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex flex-col items-center gap-1 mb-4"
                  >
                    <span className="text-lg">Finalizar Pedido</span>
                    <span className="text-[11px] font-normal opacity-90 tracking-wide uppercase">
                      por PIX (5% OFF) ou Cartão
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-green-600" /> Compra 100% segura
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
                <p className="font-serif text-2xl text-foreground mb-3">Sua sacola está vazia</p>
                <p className="text-muted-foreground mb-8">
                  Que tal descobrir nosso bastão multifuncional e revolucionar sua rotina?
                </p>
                <button
                  onClick={closeCart}
                  className="bg-secondary text-secondary-foreground px-8 py-4 rounded-full font-bold shadow-sm hover:bg-secondary/80 transition-colors"
                >
                  Continuar explorando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
