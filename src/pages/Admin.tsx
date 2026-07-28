import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  User as UserIcon,
  CreditCard,
  QrCode,
  DollarSign,
  ArrowLeft,
  Trash2,
  Check,
  LogIn,
  LogOut,
  WifiOff,
  Wifi,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Order,
  subscribeToOrders,
  approveOrderInFirestore,
  deleteOrderFromFirestore,
  fetchAllOrders,
} from "../services/orderService";
import { useAuth } from "../context/AuthContext";

type FirestoreStatus = "connecting" | "connected" | "error";

export default function Admin() {
  const { user, loginWithGoogle, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreStatus>("connecting");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFirestoreStatus("connecting");

    const unsubscribe = subscribeToOrders(
      (newOrders) => {
        setOrders(newOrders);
        setLoading(false);
        setFirestoreStatus("connected");
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setLoading(false);
        setFirestoreStatus("error");
      }
    );

    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    setApproveError(null);
    try {
      const fetched = await fetchAllOrders();
      setOrders(fetched);
      setFirestoreStatus("connected");
    } catch (err: any) {
      setFirestoreStatus("error");
      setApproveError("Erro ao buscar pedidos: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    setApprovingId(orderId);
    setApproveError(null);
    try {
      await approveOrderInFirestore(orderId);
      // Optimistic UI update — Firestore snapshot will confirm shortly
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, paymentStatus: "approved", updatedAt: new Date().toISOString() }
            : o
        )
      );
    } catch (err: any) {
      setApproveError(`Erro ao aprovar pedido ${orderId}: ${err?.message || String(err)}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja remover este pedido?")) return;
    setDeletingId(orderId);
    try {
      await deleteOrderFromFirestore(orderId);
    } catch (err: any) {
      setApproveError(`Erro ao excluir pedido ${orderId}: ${err?.message || String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.cpf.includes(search);
    const matchesFilter = filterStatus === "all" ? true : order.paymentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalSales = orders
    .filter((o) => o.paymentStatus === "approved")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPending = orders.filter((o) => o.paymentStatus === "pending").length;
  const totalApproved = orders.filter((o) => o.paymentStatus === "approved").length;

  return (
    <div className="min-h-screen bg-muted/20 text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-muted hover:bg-muted/80 rounded-2xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-serif font-bold">Painel de Administração</h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {firestoreStatus === "connected" && (
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                    <Wifi className="w-3 h-3" /> Firebase conectado — tempo real ativo
                  </span>
                )}
                {firestoreStatus === "connecting" && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Conectando ao Firebase…
                  </span>
                )}
                {firestoreStatus === "error" && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                    <WifiOff className="w-3 h-3" /> Erro de conexão com Firebase
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {user && !user.isAnonymous ? (
              <div className="flex items-center gap-2 bg-muted/80 px-3 py-1.5 rounded-2xl text-xs">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "Admin"} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    {user.displayName?.[0] || "A"}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-foreground text-xs leading-tight">
                    {user.displayName || "Admin Conectado"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user.email}</span>
                </div>
                <button onClick={logout} title="Sair" className="ml-1 p-1 text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => loginWithGoogle()}
                className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <LogIn className="w-4 h-4" />
                Entrar com Google
              </button>
            )}

            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Firestore error banner */}
        {firestoreStatus === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-2xl text-sm"
          >
            <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Sem conexão com o Firebase</p>
              <p className="text-xs mt-0.5">
                Os pedidos em tempo real não estão chegando. Verifique as regras do Firestore e se o
                login com Google está ativo. Clique em "Atualizar" para tentar novamente.
              </p>
            </div>
          </motion.div>
        )}

        {/* Approve error banner */}
        {approveError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-4 rounded-2xl text-sm"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Ação não concluída</p>
              <p className="text-xs mt-0.5">{approveError}</p>
            </div>
            <button onClick={() => setApproveError(null)} className="text-xs underline">Fechar</button>
          </motion.div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-[10px] text-muted-foreground">No Firebase</span>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Aguardando PIX</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-serif font-bold text-amber-500">{totalPending}</p>
            <span className="text-[10px] text-muted-foreground">Confirmar recebimento</span>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Pagamentos OK</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-serif font-bold text-green-600">{totalApproved}</p>
            <span className="text-[10px] text-muted-foreground">Aprovados</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-border">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por Nome, E-mail, CPF ou ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-xs outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {(["all", "pending", "approved"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === status
                    ? status === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : status === "pending"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-green-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {status === "all" && `Todos (${orders.length})`}
                {status === "pending" && `Pendentes (${totalPending})`}
                {status === "approved" && `Aprovados (${totalApproved})`}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading && orders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Conectando ao Firebase…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-base font-serif font-bold">Nenhum pedido encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Nenhum resultado para a busca." : "Ainda não há compras efetuadas."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-all space-y-5"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleCopyId(order.id)}
                          title="Copiar ID"
                          className="flex items-center gap-1.5 font-mono font-bold text-xs bg-muted px-3 py-1 rounded-lg border border-border hover:bg-muted/70 transition-colors"
                        >
                          {order.id}
                          {copiedId === order.id ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {order.paymentStatus === "approved" ? (
                        <span className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> PAGAMENTO APROVADO
                        </span>
                      ) : (
                        <>
                          <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> AGUARDANDO
                          </span>
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
                            {approvingId === order.id ? "Aprovando…" : "Confirmar Recebimento"}
                          </button>
                        </>
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

                  {/* PIX confirmation tip */}
                  {order.paymentMethod === "pix" && order.paymentStatus !== "approved" && (
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 text-xs">
                      <QrCode className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-800 dark:text-amber-300">Como confirmar o PIX</p>
                        <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                          Verifique no seu app bancário se o valor de{" "}
                          <strong>R$ {order.totalAmount.toFixed(2).replace(".", ",")}</strong> foi recebido
                          na chave <strong>{order.pixKeyUsed || "55839369837"}</strong>. Se sim, clique em{" "}
                          <strong>"Confirmar Recebimento"</strong> — o cliente verá a tela de sucesso
                          automaticamente no celular dele.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Customer Info & Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-muted/30 p-4 rounded-2xl border border-border/60">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border/40 pb-1.5">
                        <UserIcon className="w-4 h-4 text-primary" /> Dados do Cliente
                      </div>
                      <p className="font-semibold text-foreground text-sm">{order.customer.name}</p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {order.customer.email}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0" /> {order.customer.phone || "Não informado"}
                      </p>
                      <p className="text-muted-foreground font-mono">CPF: {order.customer.cpf || "Não informado"}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border/40 pb-1.5">
                        <MapPin className="w-4 h-4 text-primary" /> Endereço de Entrega
                      </div>
                      <p className="font-medium text-foreground">
                        {order.address.street
                          ? `${order.address.street}, Nº ${order.address.number}`
                          : "Endereço não informado"}
                      </p>
                      {order.address.complement && (
                        <p className="text-muted-foreground">Complemento: {order.address.complement}</p>
                      )}
                      <p className="text-muted-foreground font-mono">CEP: {order.address.cep || "Não informado"}</p>
                    </div>
                  </div>

                  {/* Items */}
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

                  {/* Payment Footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-secondary/10 p-4 rounded-2xl border border-border text-xs">
                    <div className="flex items-center gap-2">
                      {order.paymentMethod === "pix" ? (
                        <span className="flex items-center gap-1.5 font-bold text-primary">
                          <QrCode className="w-4 h-4" /> PIX — Chave: {order.pixKeyUsed || "55839369837"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-bold text-foreground">
                          <CreditCard className="w-4 h-4 text-primary" /> Cartão via Mercado Pago
                          {order.mpPaymentId && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (ID: {order.mpPaymentId})
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-base font-serif font-bold">
                      <span className="text-muted-foreground text-xs font-sans">Total:</span>
                      <span className="text-primary text-xl">
                        R$ {order.totalAmount.toFixed(2).replace(".", ",")}
                      </span>
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
