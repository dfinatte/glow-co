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
  getDoc,
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

/**
 * Save or update an order in Firestore with local backup and fast non-blocking timeout
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, order.id);
  const dataToSave = {
    ...order,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately save to localStorage for instant cross-tab access
  try {
    const stored = JSON.parse(localStorage.getItem('glow_orders') || '[]');
    const filtered = stored.filter((o: Order) => o.id !== order.id);
    filtered.unshift(dataToSave);
    localStorage.setItem('glow_orders', JSON.stringify(filtered));
  } catch (e) {}

  // 2. Immediately send to backend Express server API
  try {
    fetch('/api/admin/sync-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSave),
    }).catch(() => {});
  } catch (e) {}

  // 3. Persist to Firestore with a 1.5s timeout race so it NEVER blocks or hangs the checkout UI
  try {
    const setPromise = setDoc(orderRef, dataToSave, { merge: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    await Promise.race([setPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Aviso: Gravação no Firestore com fallback local:', error);
  }
}

/**
 * Helper to get local merged orders
 */
export function getLocalOrders(): Order[] {
  try {
    const stored = localStorage.getItem('glow_orders');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Subscribe to all orders in real-time (for Admin panel)
 */
export function subscribeToOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  // Merge Firestore and localStorage orders to guarantee full real-time updates
  const mergeAndEmit = (firestoreOrders: Order[]) => {
    const local = getLocalOrders();
    const map = new Map<string, Order>();
    
    // Add local first
    local.forEach((o) => map.set(o.id, o));
    // Firestore overrides local
    firestoreOrders.forEach((o) => map.set(o.id, o));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    onData(merged);
  };

  // Initial emission from local storage
  mergeAndEmit([]);

  // Firestore real-time snapshot
  const unsubFirestore = onSnapshot(
    q,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        ordersList.push(docSnap.data() as Order);
      });
      mergeAndEmit(ordersList);
    },
    (error) => {
      console.warn('Aviso do listener do Firestore (usando fallback local):', error);
      if (onError) onError(error);
      mergeAndEmit([]);
    }
  );

  // Cross-tab storage listener so open Admin tabs update instantly when order is made in another tab
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'glow_orders') {
      mergeAndEmit([]);
    }
  };
  window.addEventListener('storage', handleStorageChange);

  // Periodic poll to fetch server orders every 3 seconds
  const interval = setInterval(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const apiOrders: Order[] = await res.json();
        if (apiOrders && apiOrders.length > 0) {
          mergeAndEmit(apiOrders);
        }
      }
    } catch (e) {}
  }, 3000);

  return () => {
    unsubFirestore();
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(interval);
  };
}

/**
 * Subscribe to a single order by ID in real-time (for Checkout page)
 */
export function subscribeToSingleOrder(
  orderId: string,
  onData: (order: Order | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  const checkLocal = () => {
    const local = getLocalOrders();
    const found = local.find((o) => o.id === orderId);
    if (found) onData(found);
  };

  checkLocal();

  const unsubFirestore = onSnapshot(
    orderRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as Order);
      } else {
        checkLocal();
      }
    },
    (error) => {
      if (onError) onError(error);
      checkLocal();
    }
  );

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'glow_orders') {
      checkLocal();
    }
  };
  window.addEventListener('storage', handleStorageChange);

  return () => {
    unsubFirestore();
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Approve payment status of an order
 */
export async function approveOrderInFirestore(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const updateData = {
    paymentStatus: 'approved' as const,
    updatedAt: new Date().toISOString(),
  };

  // 1. Local update
  try {
    const stored = getLocalOrders();
    const updated = stored.map((o: Order) =>
      o.id === orderId ? { ...o, ...updateData } : o
    );
    localStorage.setItem('glow_orders', JSON.stringify(updated));
  } catch (e) {}

  // 2. Server API
  try {
    fetch(`/api/admin/orders/${orderId}/approve`, {
      method: 'POST',
    }).catch(() => {});
  } catch (e) {}

  // 3. Firestore update with timeout
  try {
    const updatePromise = updateDoc(orderRef, updateData);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    await Promise.race([updatePromise, timeoutPromise]);
  } catch (error) {
    try {
      setDoc(orderRef, { id: orderId, ...updateData }, { merge: true }).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Delete an order
 */
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  // 1. Local delete
  try {
    const stored = getLocalOrders();
    const filtered = stored.filter((o: Order) => o.id !== orderId);
    localStorage.setItem('glow_orders', JSON.stringify(filtered));
  } catch (e) {}

  // 2. Server API
  try {
    fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (e) {}

  // 3. Firestore delete with timeout
  try {
    const deletePromise = deleteDoc(orderRef);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    await Promise.race([deletePromise, timeoutPromise]);
  } catch (error) {
    console.warn('Aviso ao deletar do Firestore:', error);
  }
}

/**
 * One-off fetch of all orders
 */
export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const result: Order[] = [];
    snapshot.forEach((docSnap) => {
      result.push(docSnap.data() as Order);
    });

    const local = getLocalOrders();
    const map = new Map<string, Order>();
    local.forEach((o) => map.set(o.id, o));
    result.forEach((o) => map.set(o.id, o));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (error) {
    return getLocalOrders();
  }
}
