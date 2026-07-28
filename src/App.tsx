import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { CartProvider } from '@/context/CartContext';
import Store from '@/pages/Store';
import Checkout from '@/pages/Checkout';
import ProductDetail from '@/pages/ProductDetail';
import Admin from '@/pages/Admin';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import WhatsAppButton from '@/components/WhatsAppButton';

const queryClient = new QueryClient();

const baseUrl = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' 
  ? import.meta.env.BASE_URL.replace(/\/$/, '') 
  : undefined;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={baseUrl}>
            <Switch>
              <Route path="/" component={Store} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/checkout/*" component={Checkout} />
              <Route path="/carrinho" component={Checkout} />
              <Route path="/carrinho/*" component={Checkout} />
              <Route path="/cart" component={Checkout} />
              <Route path="/admin" component={Admin} />
              <Route path="/admin/*" component={Admin} />
              <Route path="/painel" component={Admin} />
              <Route path="/painel/*" component={Admin} />
              <Route path="/dashboard" component={Admin} />
              <Route path="/dashboard/*" component={Admin} />
              <Route path="/produto/:id" component={ProductDetail} />
              <Route path="/product/:id" component={ProductDetail} />
              <Route path="/produtos/:id" component={ProductDetail} />
              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
          <WhatsAppButton />
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
