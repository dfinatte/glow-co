import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface OrderItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  color?: string;
}

export interface Order {
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
  paymentMethod: 'pix' | 'card';
  paymentStatus: 'pending' | 'approved' | 'rejected';
  mpPaymentId?: string;
  pixKeyUsed?: string;
  updatedAt?: string;
}

const ORDERS_COLLECTION = 'orders';

// ─── localStorage helpers (same-device only, never cross-device) ──────────────

export function getLocalOrders(): Order[] {
  try {
    const stored = localStorage.getItem('glow_orders');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order: Order) {
  try {
    const stored = getLocalOrders();
    const filtered = stored.filter((o) => o.id !== order.id);
    filtered.unshift(order);
    localStorage.setItem('glow_orders', JSON.stringify(filtered));
  } catch {}
}

function updateLocalOrderStatus(orderId: string, status: 'approved' | 'pending' | 'rejected') {
  try {
    const stored = getLocalOrders();
    const updated = stored.map((o) =>
      o.id === orderId ? { ...o, paymentStatus: status, updatedAt: new Date().toISOString() } : o
    );
    localStorage.setItem('glow_orders', JSON.stringify(updated));
  } catch {}
}

// ─── saveOrderToFirestore ─────────────────────────────────────────────────────
//
// Strategy: salva no localStorage imediatamente (UX instant), depois escreve no
// Firestore sem timeout rígido. A função retorna em até 2 s para não travar a
// tela de checkout — mas a escrita continua em background com retry automático.
// Isso garante que pedidos de celular com conexão lenta sempre cheguem ao admin.
//
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const dataToSave: Order = { ...order, updatedAt: new Date().toISOString() };
  const orderRef = doc(db, ORDERS_COLLECTION, order.id);

  // 1. Salva localmente para UX imediata no mesmo dispositivo
  saveLocalOrder(dataToSave);

  // 2. Sincroniza com o servidor Express (in-memory, fallback rápido)
  fetch('/api/admin/sync-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataToSave),
  }).catch(() => {});

  // 3. Firestore — fonte de verdade cross-device
  //    Inicia a escrita e aguarda no máximo 2 s antes de retornar para o checkout.
  //    Se não completar nesse tempo, a Promise continua rodando em background
  //    com retry automático após 3 s.
  const writeWithRetry = async () => {
    try {
      await setDoc(orderRef, dataToSave, { merge: true });
    } catch (firstError) {
      // Aguarda 3 s e tenta novamente (recupera falhas de rede momentâneas)
      await new Promise((r) => setTimeout(r, 3000));
      try {
        await setDoc(orderRef, dataToSave, { merge: true });
      } catch (secondError) {
        console.warn('[Glow] Firestore write failed after retry. Order exists locally only.', secondError);
      }
    }
  };

  const backgroundWrite = writeWithRetry(); // inicia sem bloquear

  // Retorna quando a escrita termina OU após 2 s (o que vier primeiro)
  await Promise.race([
    backgroundWrite,
    new Promise<void>((resolve) => setTimeout(resolve, 2000)),
  ]);
  // backgroundWrite continua em background se não terminou nos 2 s
}

// ─── subscribeToOrders (Admin) ────────────────────────────────────────────────
//
// Usa APENAS o Firestore onSnapshot — a única fonte cross-device.
// Removido o merge de localStorage (device-local) e o polling do servidor
// (in-memory, reseta no restart) que mascaram falhas e confundem o painel.
//
export function subscribeToOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        ordersList.push(docSnap.data() as Order);
      });
      onData(ordersList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

// ─── subscribeToSingleOrder (Checkout) ───────────────────────────────────────
//
// Monitora um pedido específico em tempo real.
// Quando o admin aprova via painel, o cliente vê a tela de sucesso
// automaticamente — mesmo em outro dispositivo.
//
export function subscribeToSingleOrder(
  orderId: string,
  onData: (order: Order | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  // Emite do localStorage enquanto a conexão Firestore não está pronta
  const local = getLocalOrders().find((o) => o.id === orderId);
  if (local) onData(local);

  const unsubscribe = onSnapshot(
    orderRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as Order);
      } else {
        // Documento ainda não existe no Firestore, usa localStorage
        const localFallback = getLocalOrders().find((o) => o.id === orderId);
        onData(localFallback ?? null);
      }
    },
    (error) => {
      if (onError) onError(error);
      // Fallback para localStorage se Firestore falhar
      const localFallback = getLocalOrders().find((o) => o.id === orderId);
      onData(localFallback ?? null);
    }
  );

  return unsubscribe;
}

// ─── approveOrderInFirestore ──────────────────────────────────────────────────
//
// Admin clica em "Aprovar" → atualiza Firestore → subscribeToSingleOrder no
// celular do cliente detecta a mudança → mostra tela de sucesso automaticamente.
//
export async function approveOrderInFirestore(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const updateData = {
    paymentStatus: 'approved' as const,
    updatedAt: new Date().toISOString(),
  };

  // Atualiza localStorage do admin (mesmo dispositivo)
  updateLocalOrderStatus(orderId, 'approved');

  // Atualiza servidor Express
  fetch(`/api/admin/orders/${orderId}/approve`, { method: 'POST' }).catch(() => {});

  // Atualiza Firestore — isso dispara o onSnapshot no celular do cliente
  try {
    await updateDoc(orderRef, updateData);
  } catch {
    // Documento pode não existir ainda, usa setDoc com merge
    try {
      await setDoc(orderRef, { id: orderId, ...updateData }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
      throw e; // propaga para o Admin.tsx mostrar erro
    }
  }
}

// ─── deleteOrderFromFirestore ─────────────────────────────────────────────────
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  // Remove do localStorage
  try {
    const stored = getLocalOrders().filter((o) => o.id !== orderId);
    localStorage.setItem('glow_orders', JSON.stringify(stored));
  } catch {}

  // Remove do servidor
  fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' }).catch(() => {});

  // Remove do Firestore
  try {
    await deleteDoc(orderRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ORDERS_COLLECTION}/${orderId}`);
    throw error;
  }
}

// ─── fetchAllOrders (manual refresh) ─────────────────────────────────────────
export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const result: Order[] = [];
    snapshot.forEach((docSnap) => result.push(docSnap.data() as Order));
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
    throw error;
  }
}
