import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Link } from 'wouter';

export default function Header() {
  const { cartItems, openCart } = useCart();
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-[1200px] mx-auto px-4 h-[72px] flex items-center justify-between">
        <div className="w-10"></div> {/* Spacer for center alignment */}
        
        <Link href="/" className="text-2xl md:text-3xl font-serif tracking-widest text-foreground flex-1 text-center font-semibold cursor-pointer">
          GLOW & CO.
        </Link>
        
        <button 
          onClick={openCart}
          className="relative p-2 w-12 h-12 flex items-center justify-center text-foreground hover:text-primary transition-colors rounded-full hover:bg-muted/50"
          data-testid="button-open-cart"
        >
          <ShoppingBag strokeWidth={1.5} className="w-6 h-6" />
          {itemCount > 0 && (
            <span className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
