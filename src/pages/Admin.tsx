import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  User,
  CreditCard,
  QrCode,
  DollarSign,
  ArrowLeft,
  Trash2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  color?: string;
}

interface Order {
  id: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
  };
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: "pix" | "card";
  paymentStatus: "pending" | "approved" | "rejected";
  mpPaymentId?: string;
  pixKeyUsed?: string;
}

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    let apiOrders: Order[] = [];
    try {
      const res = await fetch("/api/admin/orders");
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        apiOrders = await res.json();
      }
    } catch (err) {
      console.warn("API de ordens indisponível, usando localStorage:", err);
    }

    let localOrders: Order[] = [];
    try {
      const stored = localStorage.getItem("glow_orders");
      if (stored) localOrders = JSON.parse(stored);
    } catch (e) {}

    const orderMap = new Map<string, Order>();
    localOrders.forEach((o) => orderMap.set(o.id, o));
    apiOrders.forEach((o) => orderMap.set(o.id, o));

    const merged = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setOrders(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (orderId: string) => {
    setApprovingId(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: "POST",
      });
    } catch (err) {}

    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId ? { ...o, paymentStatus: "approved" as const } : o
      );
      try {
        localStorage.setItem("glow_orders", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setApprovingId(null);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja remover este pedido?")) return;
    setDeletingId(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });
    } catch (err) {}

    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      try {
        localStorage.setItem("glow_orders", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setDeletingId(null);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.cpf.includes(search);

    const matchesFilter =
      filterStatus === "all" ? true : order.paymentStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalSales = orders
    .filter((o) => o.paymentStatus === "approved")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalPending = orders.filter((o) => o.paymentStatus === "pending").length;
  const totalApproved = orders.filter((o) => o.paymentStatus === "approved").length;

  return (
    <div className="min-h-screen bg-muted/20 text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-muted hover:bg-muted/80 rounded-2xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-serif font-bold">Painel de Administração de Pedidos</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gerencie todos os pedidos, endereços dos clientes e confirme pagamentos do Mercado Pago e PIX.
              </p>
            </div>
          </div>

          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl text-xs font-bold transition-all self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            Atualizar Pedidos
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Faturamento Aprovado</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-serif font-bold text-green-600">
              R$ {totalSales.toFixed(2).replace(".", ",")}
            </p>
            <span className="text-[10px] text-muted-foreground">Vendas confirmadas</span>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total de Pedidos</span>
              <Package className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-serif font-bold">{orders.length}</p>
            <span className="text-[10px] text-muted-foreground">Cadastrados no sistema</span>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Aguardando Pagamento</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-serif font-bold text-amber-500">{totalPending}</p>
            <span className="text-[10px] text-muted-foreground">PIX / Cartão Pendente</span>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Pagamentos Efetuados</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-serif font-bold text-green-600">{totalApproved}</p>
            <span className="text-[10px] text-muted-foreground">Aprovados pelo Admin / MP</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-border">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por Nome, E-mail, CPF ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-xs outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === "pending"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Pendentes ({totalPending})
            </button>
            <button
              onClick={() => setFilterStatus("approved")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === "approved"
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Aprovados ({totalApproved})
            </button>
          </div>
        </div>

        {/* Orders List */}
        {loading && orders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Carregando pedidos do sistema...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-base font-serif font-bold text-foreground">Nenhum pedido encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Nenhum resultado corresponde à sua busca." : "Ainda não há compras efetuadas na loja."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-all space-y-6"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm bg-muted px-3 py-1 rounded-lg border border-border">
                          {order.id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {order.paymentStatus === "approved" ? (
                        <span className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          PAGAMENTO APROVADO
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-500" />
                          AGUARDANDO PAGAMENTO
                        </span>
                      )}

                      {/* Approve PIX Button */}
                      {order.paymentStatus !== "approved" && (
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={approvingId === order.id}
                          className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {approvingId === order.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Dar OK / Aprovar
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={deletingId === order.id}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                        title="Excluir Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Customer Info & Address Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-2xl border border-border/60">
                    {/* Customer */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border/40 pb-1.5">
                        <User className="w-4 h-4 text-primary" />
                        Dados do Cliente
                      </div>
                      <p className="font-semibold text-foreground text-sm">{order.customer.name}</p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {order.customer.email}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0" /> {order.customer.phone || "Não informado"}
                      </p>
                      <p className="text-muted-foreground font-mono">
                        CPF: {order.customer.cpf || "Não informado"}
                      </p>
                    </div>

                    {/* Address */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border/40 pb-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        Endereço Completo de Entrega
                      </div>
                      <p className="font-medium text-foreground">
                        {order.address.street ? `${order.address.street}, Nº ${order.address.number}` : "Endereço não informado"}
                      </p>
                      {order.address.complement && (
                        <p className="text-muted-foreground">Complemento: {order.address.complement}</p>
                      )}
                      <p className="text-muted-foreground font-mono">
                        CEP: {order.address.cep || "Não informado"}
                      </p>
                    </div>
                  </div>

                  {/* Purchased Items Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Itens Comprados ({order.items.length})
                    </h4>
                    <div className="divide-y divide-border/60 border border-border/60 rounded-2xl overflow-hidden bg-card">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-12 h-14 object-cover rounded-lg bg-muted border border-border" />
                            ) : (
                              <div className="w-12 h-14 bg-muted rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground">{item.name}</p>
                              {item.color && <p className="text-[10px] text-muted-foreground">Cor: {item.color}</p>}
                              <p className="text-muted-foreground">Qtd: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-bold text-foreground text-sm">
                            R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-secondary/10 p-4 rounded-2xl border border-border text-xs">
                    <div className="flex items-center gap-2">
                      {order.paymentMethod === "pix" ? (
                        <span className="flex items-center gap-1.5 font-bold text-primary">
                          <QrCode className="w-4 h-4" /> Pagamento via PIX (Chave Celular: {order.pixKeyUsed || "55839369837"})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-bold text-foreground">
                          <CreditCard className="w-4 h-4 text-primary" /> Cartão de Crédito via Mercado Pago
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-base font-serif font-bold">
                      <span className="text-muted-foreground text-xs font-sans">Total do Pedido:</span>
                      <span className="text-primary text-xl">R$ {order.totalAmount.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
