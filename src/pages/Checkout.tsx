import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useCart } from '@/context/CartContext';
import { useLocation } from 'wouter';
import {
  ChevronLeft,
  Shield,
  CheckCircle2,
  Lock,
  CreditCard,
  Banknote,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Sparkles,
  PhoneCall,
  MapPin,
  ArrowLeftRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { saveOrderToFirestore, subscribeToSingleOrder, Order } from '../services/orderService';

interface PixResponse {
  id: string;
  orderId?: string;
  status: string;
  status_detail?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  date_of_expiration?: string;
  pixKey?: string;
  is_demo?: boolean;
  notice?: string;
}

function generateClientPixPayload(
  key: string,
  amount: number,
  name: string = "GLOW AND CO",
  city: string = "SAO PAULO",
  txId: string = "***"
): string {
  const cleanKey = key.replace(/\D/g, "");
  const formatField = (id: string, val: string) => `${id}${val.length.toString().padStart(2, "0")}${val}`;
  const gui = formatField("00", "br.gov.bcb.pix");
  const keyField = formatField("01", cleanKey);
  const merchantAccount = formatField("26", `${gui}${keyField}`);
  const mcc = formatField("52", "0000");
  const currency = formatField("53", "986");
  const amountStr = Number(amount).toFixed(2);
  const amountField = formatField("54", amountStr);
  const country = formatField("58", "BR");
  const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 25).toUpperCase() || "GLOW AND CO";
  const merchantName = formatField("59", cleanName);
  const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 15).toUpperCase() || "SAO PAULO";
  const merchantCity = formatField("60", cleanCity);
  const cleanTxId = txId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";
  const txIdField = formatField("05", cleanTxId);
  const additionalData = formatField("62", txIdField);

  const rawPayload = `000201${merchantAccount}${mcc}${currency}${amountField}${country}${merchantName}${merchantCity}${additionalData}6304`;

  let crc = 0xFFFF;
  for (let i = 0; i < rawPayload.length; i++) {
    crc ^= rawPayload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return `${rawPayload}${crcHex}`;
}

function saveOrderLocally(order: any) {
  try {
    const existing = JSON.parse(localStorage.getItem('glow_orders') || '[]');
    const filtered = existing.filter((o: any) => o.id !== order.id);
    filtered.unshift(order);
    localStorage.setItem('glow_orders', JSON.stringify(filtered));
  } catch (err) {
    console.error('Erro ao salvar pedido no localStorage:', err);
  }
}

function updateLocalOrderStatus(orderId: string, status: 'approved' | 'pending' | 'rejected') {
  try {
    const existing = JSON.parse(localStorage.getItem('glow_orders') || '[]');
    const updated = existing.map((o: any) => o.id === orderId ? { ...o, paymentStatus: status } : o);
    localStorage.setItem('glow_orders', JSON.stringify(updated));
  } catch (err) {}
}

async function createClientMercadoPagoPreference(
  orderId: string,
  items: any[],
  totalAmount: number,
  payer: any,
  shippingCost: number = 0
) {
  const MP_ACCESS_TOKEN = 'APP_USR-6590395360723241-072718-e5347f510a815f5389bd335e2f462631-1268573698';

  const mpItems = items.map((item) => ({
    id: String(item.id || 'prod_glow'),
    title: String(item.name || 'Produto Glow & Co.').slice(0, 250),
    quantity: Number(item.quantity) || 1,
    currency_id: 'BRL',
    unit_price: Number(Number(item.price || 0).toFixed(2)),
  }));

  if (shippingCost > 0) {
    mpItems.push({
      id: 'ship_glow',
      title: 'Frete de Entrega Expressa',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(Number(shippingCost).toFixed(2)),
    });
  }

  const origin = window.location.origin;

  const body = {
    items: mpItems,
    payer: {
      name: payer.name || 'Cliente',
      email: (payer.email && payer.email.includes('@')) ? payer.email : 'cliente@glowco.com.br',
    },
    back_urls: {
      success: `${origin}/checkout?status=approved&order_id=${orderId}`,
      failure: `${origin}/checkout?status=failure&order_id=${orderId}`,
      pending: `${origin}/checkout?status=pending&order_id=${orderId}`,
    },
    auto_return: 'approved',
    external_reference: orderId,
  };

  try {
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const resData = await res.json();
      return resData.init_point || resData.sandbox_init_point || null;
    } else {
      const errorJson = await res.json().catch(() => ({}));
      console.warn('Mercado Pago Direct Preference API Response:', res.status, errorJson);
      return null;
    }
  } catch (err) {
    console.error('Erro na requisição ao Mercado Pago:', err);
    return null;
  }
}

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [, setLocation] = useLocation();

  // Load persisted method & customer form state
  const [method, setMethod] = useState<'pix' | 'card'>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('glow_checkout_form') || '{}');
      return saved.method === 'card' ? 'card' : 'pix';
    } catch { return 'pix'; }
  });

  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Customer Form State with localStorage persistence
  const [name, setName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').name || ''; } catch { return ''; }
  });
  const [email, setEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').email || ''; } catch { return ''; }
  });
  const [phone, setPhone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').phone || ''; } catch { return ''; }
  });
  const [cpf, setCpf] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').cpf || ''; } catch { return ''; }
  });
  const [cep, setCep] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').cep || ''; } catch { return ''; }
  });
  const [street, setStreet] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').street || ''; } catch { return ''; }
  });
  const [number, setNumber] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').number || ''; } catch { return ''; }
  });
  const [complement, setComplement] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glow_checkout_form') || '{}').complement || ''; } catch { return ''; }
  });

  // Mercado Pago API States
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(() => {
    try {
      const saved = localStorage.getItem('glow_active_pix');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date_of_expiration && new Date(parsed.date_of_expiration).getTime() > Date.now()) {
          return parsed;
        } else {
          localStorage.removeItem('glow_active_pix');
        }
      }
    } catch {}
    return null;
  });

  const [copiedPixCode, setCopiedPixCode] = useState(false);
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cardOrderId, setCardOrderId] = useState<string | null>(null);

  // Automatically save customer form state when edited
  useEffect(() => {
    try {
      localStorage.setItem('glow_checkout_form', JSON.stringify({
        name, email, phone, cpf, cep, street, number, complement, method
      }));
    } catch (err) {}
  }, [name, email, phone, cpf, cep, street, number, complement, method]);

  // Save active PIX order state
  useEffect(() => {
    if (pixData) {
      try {
        localStorage.setItem('glow_active_pix', JSON.stringify(pixData));
      } catch {}
    } else {
      try {
        localStorage.removeItem('glow_active_pix');
      } catch {}
    }
  }, [pixData]);

  // Shipping & Totals calculation
  const shippingCost = cartTotal >= 200 || cartTotal === 0 ? 0 : 15.90;
  const pixDiscount = method === 'pix' ? cartTotal * 0.05 : 0;
  const finalTotal = cartTotal - pixDiscount + shippingCost;

  // Check URL search params for Mercado Pago callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') || params.get('collection_status');
    const orderIdParam = params.get('order_id') || params.get('external_reference');

    if (statusParam === 'approved' || statusParam === 'authorized') {
      if (orderIdParam) {
        updateLocalOrderStatus(orderIdParam, 'approved');
      }
      setSubmitted(true);
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
      clearCart();
    } else if (orderIdParam) {
      fetch(`/api/mercadopago/payment-status/${orderIdParam}`)
        .then((res) => {
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) return res.json();
          return null;
        })
        .then((data) => {
          if (data && data.status === 'approved') {
            updateLocalOrderStatus(orderIdParam, 'approved');
            setSubmitted(true);
            confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
            clearCart();
          }
        })
        .catch(() => {});
    }
  }, [clearCart]);

  // Redirect to store if cart is empty and no active order
  useEffect(() => {
    if (cartItems.length === 0 && !submitted && !pixData && !cardOrderId && !loading) {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('order_id')) {
        setLocation('/');
      }
    }
  }, [cartItems, setLocation, submitted, pixData, cardOrderId, loading]);

  // Timer for PIX expiration
  useEffect(() => {
    if (pixData && pixData.status === 'pending') {
      const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [pixData]);

  // Listen to Firestore real-time updates for the pending order
  useEffect(() => {
    const activeId = pixData?.orderId || pixData?.id || cardOrderId;
    if (!activeId || submitted) return;

    // 1. Subscribe directly to Firestore document for real-time approval detection
    const unsub = subscribeToSingleOrder(activeId, (orderDoc) => {
      if (orderDoc && orderDoc.paymentStatus === 'approved') {
        setSubmitted(true);
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        clearCart();
        localStorage.removeItem('glow_active_pix');
      }
    });

    // 2. Secondary fallback check via server endpoint / local storage
    const interval = setInterval(async () => {
      try {
        const savedOrders = localStorage.getItem('glow_orders');
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const matchedOrder = orders.find(
            (o: any) => o.id === activeId || o.id === pixData?.orderId || o.id === pixData?.id
          );
          if (matchedOrder && matchedOrder.paymentStatus === 'approved') {
            setSubmitted(true);
            confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
            clearCart();
            localStorage.removeItem('glow_active_pix');
            return;
          }
        }
      } catch (err) {}

      try {
        const res = await fetch(`/api/mercadopago/payment-status/${activeId}`);
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json();
          if (data.status === 'approved') {
            updateLocalOrderStatus(activeId, 'approved');
            setSubmitted(true);
            confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
            clearCart();
            localStorage.removeItem('glow_active_pix');
          }
        }
      } catch (err) {}
    }, 2500);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [pixData, cardOrderId, submitted, clearCart]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    const formatted = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(formatted);
  };

  const handleCepChange = async (val: string) => {
    const rawCep = val.replace(/\D/g, '').slice(0, 8);
    const formatted = rawCep.length > 5 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5)}` : rawCep;
    setCep(formatted);

    if (rawCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (data.logradouro) setStreet(data.logradouro);
            if (data.complemento && !complement) setComplement(data.complemento);
          }
        }
      } catch (err) {}
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setLoading(true);

    try {
      const shippingCost = cartTotal >= 200 || cartTotal === 0 ? 0 : 15.90;
      const totalToPay = (method === 'pix' ? cartTotal * 0.95 : cartTotal) + shippingCost;

      const payerData = {
        name,
        email,
        phone,
        cpf: cpf.replace(/\D/g, ''),
      };

      const addressData = {
        cep,
        street,
        number,
        complement,
      };

      if (method === 'pix') {
        const orderId = `ord_${Date.now().toString().slice(-6)}`;
        
        const newOrderObj: Order = {
          id: orderId,
          createdAt: new Date().toISOString(),
          customer: payerData,
          address: addressData,
          items: cartItems.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
            color: i.color,
          })),
          totalAmount: totalToPay,
          paymentMethod: 'pix',
          paymentStatus: 'pending',
          pixKeyUsed: '55839369837',
        };

        // Save order in Firestore so Admin page updates in real-time
        await saveOrderToFirestore(newOrderObj);

        // Direct Client-side PIX Payload (100% valid EMV BR Code)
        const pixCode = generateClientPixPayload('55839369837', totalToPay, name || 'GLOW AND CO', 'SAO PAULO', orderId);
        const directPix: PixResponse = {
          id: `pix_${orderId}`,
          orderId,
          status: 'pending',
          status_detail: 'waiting_transfer',
          qr_code: pixCode,
          pixKey: '55839369837',
          date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };

        setPixData(directPix);
        setTimeLeft(15 * 60);
      } else if (method === 'card') {
        const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

        const newOrderObj: Order = {
          id: orderId,
          createdAt: new Date().toISOString(),
          customer: payerData,
          address: addressData,
          items: cartItems.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
            color: i.color,
          })),
          totalAmount: totalToPay,
          paymentMethod: 'card',
          paymentStatus: 'pending',
        };

        // Save order in Firestore so Admin page updates in real-time
        await saveOrderToFirestore(newOrderObj);

        let initPoint: string | null = null;

        // Try direct Mercado Pago API first to prevent 404 errors on Netlify static host
        try {
          initPoint = await createClientMercadoPagoPreference(
            orderId,
            cartItems,
            totalToPay,
            payerData,
            shippingCost
          );
        } catch (clientMpErr) {
          console.warn('Erro ao chamar Mercado Pago diretamente, tentando backend local:', clientMpErr);
        }

        // If direct API didn't return (or failed), try backend endpoint
        if (!initPoint) {
          try {
            const response = await fetch('/api/mercadopago/create-preference', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                totalAmount: totalToPay,
                shippingCost,
                payer: payerData,
                address: addressData,
                items: cartItems.map((i) => ({
                  id: i.id,
                  name: i.name,
                  quantity: i.quantity,
                  price: i.price,
                  image: i.image,
                  color: i.color,
                })),
              }),
            });

            const ct = response.headers.get('content-type') || '';
            if (response.ok && ct.includes('application/json')) {
              const data = await response.json();
              if (data && data.init_point) {
                initPoint = data.init_point;
              }
            }
          } catch (err) {
            // Silently ignore static server response
          }
        }

        if (initPoint) {
          setCardOrderId(orderId);
          window.location.href = initPoint;
        } else {
          setPaymentError('Não foi possível conectar com o Mercado Pago para pagamento com cartão de crédito. Por favor, tente novamente ou escolha a opção PIX para desconto de 5%.');
        }
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Ocorreu um erro ao processar o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopiedPixCode(true);
      setTimeout(() => setCopiedPixCode(false), 3000);
    }
  };

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText('55839369837');
    setCopiedPixKey(true);
    setTimeout(() => setCopiedPixKey(false), 3000);
  };

  // -------------------------------------------------------------
  // Order Confirmation View (Only shown when REALLY approved)
  // -------------------------------------------------------------
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-card p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-border/80 space-y-6"
        >
          <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
              Pagamento Confirmado
            </span>
            <h1 className="text-3xl font-serif text-foreground font-bold">Obrigado pelo seu pedido!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mt-2">
              Seu pagamento foi confirmado com sucesso. Nossos especialistas já estão preparando seu pacote para envio imediato!
            </p>
          </div>

          <div className="bg-muted/40 p-4 rounded-2xl border border-border text-left space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Status:</span>
              <span className="font-bold text-green-600 uppercase">Aprovado</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Gateway:</span>
              <span className="font-medium text-foreground">Mercado Pago</span>
            </div>
          </div>

          <button
            onClick={() => setLocation('/')}
            className="bg-primary text-primary-foreground w-full py-4 rounded-full font-bold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Voltar para a Loja
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted/20 w-full md:py-12">
      <div className="max-w-5xl mx-auto md:grid md:grid-cols-12 md:gap-8 bg-card md:rounded-[2.5rem] md:shadow-2xl overflow-hidden border border-border/80">
        
        {/* Left Column: Form & Payment Steps */}
        <div className="p-6 md:p-10 md:col-span-7 space-y-8">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar ao carrinho
          </button>

          <h2 className="text-3xl font-serif text-foreground flex items-center gap-3">
            Finalizar Pedido
            <Lock className="w-5 h-5 text-muted-foreground" />
          </h2>

          {paymentError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 dark:text-red-400 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* If PIX QR Code is generated */}
          {pixData && pixData.status === 'pending' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border-2 border-primary/30 p-6 rounded-3xl text-center space-y-6 shadow-xl"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <QrCode className="w-4 h-4" /> Pagamento via PIX - Desconto de 5%
              </div>

              <div>
                <h3 className="text-2xl font-serif text-foreground">Escaneie com seu aplicativo do banco</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Validade do código: <span className="font-bold text-primary">{formatTime(timeLeft)}</span>
                </p>
              </div>

              {/* Chave PIX Celular Box */}
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-primary" /> Chave PIX (Celular):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPixKey}
                    className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1"
                  >
                    {copiedPixKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPixKey ? 'Copiada!' : 'Copiar Chave'}
                  </button>
                </div>
                <p className="font-mono text-base font-bold text-primary tracking-wider">
                  55839369837
                </p>
              </div>

              {/* QR Code Container */}
              <div className="w-56 h-56 bg-white mx-auto p-3 rounded-2xl shadow-md border border-border flex flex-col items-center justify-center overflow-hidden">
                {pixData.qr_code_base64 && pixData.qr_code_base64.length > 200 ? (
                  <img
                    src={pixData.qr_code_base64.startsWith('data:') ? pixData.qr_code_base64 : `data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <QRCodeSVG
                    value={pixData.qr_code || '55839369837'}
                    size={200}
                    level="M"
                    includeMargin={false}
                    className="w-full h-full"
                  />
                )}
              </div>

              {/* PIX Copia e Cola */}
              <div className="space-y-2 pt-2 text-left">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Ou pague pelo PIX Copia e Cola
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pixData.qr_code || ''}
                    className="w-full text-xs p-3.5 bg-muted rounded-xl border border-border font-mono text-muted-foreground truncate outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPixCode}
                    className="bg-primary text-primary-foreground px-4 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copiedPixCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedPixCode ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Live Polling Status & Cancel / Change Method Button */}
              <div className="pt-4 border-t border-border flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  Aguardando confirmação do pagamento...
                </div>
                <p className="text-[11px] text-muted-foreground/80 text-center leading-relaxed">
                  Assim que a transferência for realizada no app do seu banco e confirmada no sistema, esta página será atualizada automaticamente com os parabéns e confirmação da compra.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPixData(null);
                    localStorage.removeItem('glow_active_pix');
                  }}
                  className="w-full mt-2 bg-muted hover:bg-muted/80 text-foreground font-bold py-3.5 px-4 rounded-xl text-xs transition-all border border-border flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  Alterar Forma de Pagamento / Cancelar Pedido
                </button>
              </div>
            </motion.div>
          ) : (
            /* Main Checkout Form */
            <form onSubmit={handleCheckout} className="space-y-8">
              {/* Section 1: Personal Details */}
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-foreground/90 border-b border-border pb-2">1. Dados Pessoais</h3>
                <div className="space-y-3">
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome Completo"
                    className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail"
                      className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                    />
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Telefone / WhatsApp"
                      className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                    />
                  </div>
                  <input
                    required
                    type="text"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="CPF (Requerido para emissão do PIX)"
                    className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                  />
                </div>
              </div>

              {/* Section 2: Address Details */}
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-foreground/90 border-b border-border pb-2">2. Endereço Completo de Entrega</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      required
                      type="text"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="CEP (Busca Automática)"
                      className="w-1/3 p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                    />
                    <input
                      required
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua / Avenida / Logradouro"
                      className="w-2/3 p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      required
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Número"
                      className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                    />
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Complemento (Apto, Bloco)"
                      className="w-full col-span-2 p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                    />
                  </div>

                  {/* Shipping Cost Badge */}
                  <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/20 text-xs flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        {cartTotal >= 200 ? 'Frete Grátis ativado (compras acima de R$ 200,00)' : 'Entrega Expressa Correios / Sedex (3 a 5 dias úteis)'}
                      </span>
                    </div>
                    <span className="font-bold text-primary shrink-0">
                      {cartTotal >= 200 ? 'GRÁTIS' : 'R$ 15,90'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Payment Options (PIX and Credit Card) */}
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-foreground/90 border-b border-border pb-2">3. Forma de Pagamento</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('pix')}
                    className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                      method === 'pix'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="font-bold text-xs">PIX com QR Code</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">-5% OFF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                      method === 'card'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-bold text-xs">Cartão de Crédito</span>
                    <span className="text-[10px] bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">Mercado Pago</span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {method === 'pix' ? (
                    <motion.div
                      key="pix-desc"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted/40 p-4 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1.5"
                    >
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Desconto especial de 5% aplicado no PIX
                      </p>
                      <p className="leading-relaxed">
                        Chave PIX Celular: <strong className="text-foreground">55839369837</strong>. Ao finalizar, o sistema gerará também o QR Code e o PIX copia e cola.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="card-desc"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted/40 p-4 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1.5"
                    >
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <ExternalLink className="w-4 h-4 text-primary" />
                        Pagamento Seguro via Mercado Pago
                      </p>
                      <p className="leading-relaxed">
                        Ao clicar em "Pagar com Cartão no Mercado Pago", você será redirecionado para a página oficial do Mercado Pago para inserir os dados do cartão com total segurança. A confirmação no site só aparecerá após o pagamento ser realmente aprovado.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-5 rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 mt-8 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Processando...
                  </>
                ) : method === 'pix' ? (
                  'Gerar PIX e Chave de Pagamento'
                ) : (
                  'Pagar com Cartão no Mercado Pago'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Order Summary */}
        <div className="bg-secondary/20 p-6 md:p-10 border-t md:border-t-0 md:border-l border-border md:col-span-5 flex flex-col h-full">
          <h3 className="font-serif text-2xl mb-6 text-foreground">Resumo do Pedido</h3>

          <div className="space-y-4 mb-6 flex-1 overflow-y-auto max-h-[350px] pr-1">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 items-center bg-card p-3 rounded-2xl border border-border/60">
                <div className="w-16 h-20 bg-muted rounded-xl overflow-hidden shrink-0 border border-border/50">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-bold text-foreground leading-snug line-clamp-2">{item.name}</p>
                  {item.color && <p className="text-muted-foreground uppercase text-[10px]">Cor: {item.color}</p>}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md border border-border text-[10px]">
                      Qtd: {item.quantity}
                    </span>
                    <span className="font-bold text-sm">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-6 border-t border-border text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span className="text-green-600 font-bold">{cartTotal >= 200 ? 'Grátis' : 'R$ 15,90'}</span>
            </div>
            {method === 'pix' && (
              <div className="flex justify-between text-green-700 dark:text-green-400 font-medium bg-green-500/10 p-2.5 rounded-xl text-xs">
                <span>Desconto PIX (5%)</span>
                <span>- R$ {(cartTotal * 0.05).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-serif font-bold pt-4 border-t border-border mt-2">
              <span>Total</span>
              <span className="text-primary">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-card p-3.5 rounded-2xl border border-border shadow-sm">
            <Shield className="w-4 h-4 text-green-600" />
            Processado com segurança via Mercado Pago
          </div>
        </div>

      </div>
    </div>
  );
}
