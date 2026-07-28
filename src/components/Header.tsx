import { ShoppingBag, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'wouter';

export default function Header() {
  const { cartItems, openCart } = useCart();
  const { user, loginWithGoogle, logout } = useAuth();
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const isGoogleUser = user && !user.isAnonymous;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-[1200px] mx-auto px-4 h-[72px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href="/admin"
            className="p-2 w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted/50"
            title="Painel de Administração"
          >
            <ShieldCheck className="w-5 h-5" />
          </Link>

          {isGoogleUser ? (
            <div className="flex items-center gap-2 bg-muted/60 px-2.5 py-1 rounded-full text-xs">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-[11px] font-medium text-foreground max-w-[100px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                onClick={logout}
                title="Sair da conta"
                className="text-muted-foreground hover:text-destructive p-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-full hover:bg-muted/50 transition-colors"
              title="Entrar com Google"
            >
              <LogIn className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline font-medium text-[11px]">Entrar com Google</span>
            </button>
          )}
        </div>
        
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
