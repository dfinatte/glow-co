import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useLocation } from 'wouter';
import { ChevronLeft, Shield, CheckCircle2, Lock, CreditCard, Banknote, QrCode, Copy, Check, ExternalLink, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PixResponse {
  id: string;
  status: string;
  status_detail?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  date_of_expiration?: string;
  is_demo?: boolean;
  notice?: string;
}

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<'pix' | 'card' | 'pro'>('pix');
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState('1');

  // Mercado Pago API States
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [mpConfig, setMpConfig] = useState<{ configured: boolean; message: string } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Check MP server configuration status on mount
  useEffect(() => {
    fetch('/api/mercadopago/config')
      .then((res) => res.json())
      .then((data) => setMpConfig(data))
      .catch(() => setMpConfig({ configured: false, message: 'Servidor local em execução.' }));
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0 && !submitted && !pixData) {
      setLocation('/');
    }
  }, [cartItems, setLocation, submitted, pixData]);

  // Timer for PIX expiration
  useEffect(() => {
    if (pixData && pixData.status === 'pending') {
      const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [pixData]);

  // Poll payment status every 4 seconds when PIX is pending
  useEffect(() => {
    if (!pixData || !pixData.id || pixData.status === 'approved') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/payment-status/${pixData.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'approved') {
            setPixData((prev) => (prev ? { ...prev, status: 'approved' } : null));
            setSubmitted(true);
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
            clearCart();
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status do PIX:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [pixData, clearCart]);

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

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleCardExpChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.replace(/(\d{2})(\d)/, '$1/$2');
    setCardExp(formatted);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setLoading(true);

    try {
      const shippingCost = cartTotal >= 200 ? 0 : 15.9;
      const totalToPay = (method === 'pix' ? cartTotal * 0.95 : cartTotal) + shippingCost;

      const payerData = {
        name,
        email,
        phone,
        cpf: cpf.replace(/\D/g, ''),
        address: `${address}, ${number} ${complement}`.trim(),
        cep,
      };

      if (method === 'pix') {
        const response = await fetch('/api/mercadopago/create-pix-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalAmount: totalToPay,
            payer: payerData,
            items: cartItems.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
          }),
        });

        const data: PixResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.notice || (data as any).error || 'Falha ao comunicar com o Mercado Pago.');
        }

        setPixData(data);
        if (data.status === 'approved') {
          setSubmitted(true);
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          clearCart();
        }
      } else if (method === 'pro') {
        const response = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalAmount: totalToPay,
            payer: payerData,
            items: cartItems.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao gerar preferência do Mercado Pago.');
        }

        if (data.init_point) {
          window.open(data.init_point, '_blank');
        }
        setSubmitted(true);
        clearCart();
      } else if (method === 'card') {
        const response = await fetch('/api/mercadopago/process-card-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalAmount: totalToPay,
            cardholderName: cardName,
            installments: Number(installments),
            payer: payerData,
            token: 'demo_card_token',
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao processar o cartão.');
        }

        setSubmitted(true);
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        clearCart();
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Ocorreu um erro ao processar o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const handleSimulateApprove = async () => {
    if (!pixData?.id) return;
    setSimulating(true);
    try {
      await fetch(`/api/mercadopago/simulate-approve-pix/${pixData.id}`, { method: 'POST' });
      setPixData((prev) => (prev ? { ...prev, status: 'approved' } : null));
      setSubmitted(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      clearCart();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  // -------------------------------------------------------------
  // Order Confirmation View
  // -------------------------------------------------------------
  if (submitted && (!pixData || pixData.status === 'approved')) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-card p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-border/80">
          <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 inline-block">
            Mercado Pago Gateway
          </span>
          <h1 className="text-3xl font-serif text-foreground mb-3">Pagamento Confirmado!</h1>
          <p className="text-muted-foreground mb-6 text-base leading-relaxed">
            Seu pedido foi processado com sucesso. Você receberá a confirmação e o código de rastreio no seu e-mail em instantes.
          </p>

          <div className="bg-muted/40 p-4 rounded-2xl mb-8 border border-border text-left space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Status do Gateway:</span>
              <span className="font-bold text-green-600 uppercase">Aprovado pelo Mercado Pago</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Método:</span>
              <span className="font-medium text-foreground uppercase">{method.toUpperCase()}</span>
            </div>
          </div>

          <button onClick={() => setLocation('/')} className="bg-primary text-primary-foreground w-full py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            Voltar para a loja
          </button>
        </motion.div>
      </div>
    );
  }

  const shippingCost = cartTotal >= 200 ? 0 : 15.9;
  const finalTotal = (method === 'pix' ? cartTotal * 0.95 : cartTotal) + shippingCost;

  return (
    <div className="min-h-[100dvh] bg-muted/20 w-full md:py-12">
      <div className="max-w-5xl mx-auto md:grid md:grid-cols-12 md:gap-8 bg-card md:rounded-[2.5rem] md:shadow-2xl overflow-hidden border border-border/80">
        
        {/* Left Column: Form & Payment Steps */}
        <div className="p-6 md:p-10 md:col-span-7">
          <button onClick={() => setLocation('/')} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar ao carrinho
          </button>

          <h2 className="text-3xl font-serif mb-8 text-foreground flex items-center gap-3">
            Finalizar Pedido
            <Lock className="w-5 h-5 text-muted-foreground" />
          </h2>

          {paymentError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 dark:text-red-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* If PIX QR Code is generated */}
          {pixData && pixData.status === 'pending' ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border-2 border-primary/30 p-6 md:p-8 rounded-3xl text-center space-y-6 shadow-xl">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <QrCode className="w-4 h-4" /> QR Code PIX Gerado pelo Mercado Pago
              </div>

              <div>
                <h3 className="text-2xl font-serif text-foreground">Escaneie com seu App de Banco</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Validade do código: <span className="font-bold text-primary">{formatTime(timeLeft)}</span>
                </p>
              </div>

              {/* QR Code Container */}
              <div className="w-56 h-56 bg-white mx-auto p-4 rounded-2xl shadow-md border border-border flex flex-col items-center justify-center relative">
                {pixData.qr_code_base64 && pixData.qr_code_base64.length > 50 ? (
                  <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code PIX Mercado Pago" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white p-4 text-center space-y-2">
                    <QrCode className="w-12 h-12 text-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-primary">PIX Mercado Pago</span>
                    <span className="text-[9px] text-slate-400">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>

              {/* PIX Copy & Paste String */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Ou pague pelo PIX Copia e Cola
                </label>
                <div className="flex gap-2 max-w-md mx-auto">
                  <input readOnly value={pixData.qr_code || ''} className="w-full text-xs p-3.5 bg-muted rounded-xl border border-border font-mono text-muted-foreground truncate outline-none select-all" />
                  <button onClick={handleCopyPix} className="bg-primary text-primary-foreground px-5 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-md">
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Status Polling Indicator */}
              <div className="pt-4 border-t border-border flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  Aguardando confirmação em tempo real pelo Mercado Pago...
                </div>

                {/* Simulated Approval Button for Easy Testing */}
                <button onClick={handleSimulateApprove} disabled={simulating} className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800 hover:bg-green-500/20 px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  {simulating ? 'Simulando aprovação...' : 'Simular Pagamento Aprovado (Testar Fluxo)'}
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
                  <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome Completo" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone / WhatsApp" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                  </div>
                  <input required type="text" value={cpf} onChange={(e) => handleCpfChange(e.target.value)} placeholder="CPF (Requerido para o Mercado Pago)" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                </div>
              </div>

              {/* Section 2: Address */}
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-foreground/90 border-b border-border pb-2">2. Endereço de Entrega</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input required type="text" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="CEP" className="w-1/3 p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                    <input required type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua / Avenida" className="w-2/3 p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input required type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                    <input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento" className="w-full col-span-2 p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 3: Payment Method Options */}
              <div className="space-y-5">
                <h3 className="font-serif text-lg text-foreground/90 border-b border-border pb-2">3. Forma de Pagamento (Mercado Pago)</h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <button type="button" onClick={() => setMethod('pix')} className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center ${method === 'pix' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    <Banknote className="w-5 h-5" />
                    <span className="font-bold text-xs">PIX Mercado Pago</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">-5% OFF</span>
                  </button>

                  <button type="button" onClick={() => setMethod('card')} className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center ${method === 'card' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    <CreditCard className="w-5 h-5" />
                    <span className="font-bold text-xs">Cartão de Crédito</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">Até 12x</span>
                  </button>

                  <button type="button" onClick={() => setMethod('pro')} className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center ${method === 'pro' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-bold text-xs">Checkout Pro</span>
                    <span className="text-[10px] bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">Mercado Pago</span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {method === 'pix' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-muted/40 p-4 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Desconto especial de 5% aplicado no PIX
                      </p>
                      <p className="leading-relaxed">
                        Ao finalizar, você receberá o QR Code do Mercado Pago com aprovação imediata.
                      </p>
                    </motion.div>
                  )}

                  {method === 'card' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pt-2">
                      <input required type="text" value={cardNumber} onChange={(e) => handleCardNumberChange(e.target.value)} placeholder="Número do Cartão" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                      <input required type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Nome Impresso no Cartão" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                      <div className="grid grid-cols-2 gap-3">
                        <input required type="text" value={cardExp} onChange={(e) => handleCardExpChange(e.target.value)} placeholder="Validade (MM/AA)" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                        <input required type="text" maxLength={4} value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))} placeholder="CVV" className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70 text-sm" />
                      </div>
                      <select value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full p-4 border border-border/80 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm">
                        <option value="1">1x de R$ {finalTotal.toFixed(2).replace('.', ',')} (À vista)</option>
                        <option value="2">2x de R$ {(finalTotal / 2).toFixed(2).replace('.', ',')}</option>
                        <option value="3">3x de R$ {(finalTotal / 3).toFixed(2).replace('.', ',')}</option>
                        <option value="6">6x de R$ {(finalTotal / 6).toFixed(2).replace('.', ',')}</option>
                        <option value="12">12x de R$ {(finalTotal / 12).toFixed(2).replace('.', ',')}</option>
                      </select>
                    </motion.div>
                  )}

                  {method === 'pro' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-muted/40 p-4 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <ExternalLink className="w-4 h-4 text-primary" />
                        Redirecionamento Seguro
                      </p>
                      <p className="leading-relaxed">
                        Você será direcionado para o Checkout Pro do Mercado Pago para concluir o pagamento.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-5 rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 mt-8 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Processando com Mercado Pago...
                  </>
                ) : method === 'pix' ? (
                  'Gerar QR Code PIX Mercado Pago'
                ) : method === 'pro' ? (
                  'Ir para o Mercado Pago Checkout Pro'
                ) : (
                  'Finalizar Compra no Cartão'
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
                    <span className="text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md border border-border text-[10px]">Qtd: {item.quantity}</span>
                    <span className="font-bold text-sm">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
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
                <span>Desconto PIX Mercado Pago (5%)</span>
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
