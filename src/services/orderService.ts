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
 * Save or update an order in Firestore
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, order.id);
  const dataToSave = {
    ...order,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(orderRef, dataToSave, { merge: true });
    
    // Also save in localStorage for instant local backup
    try {
      const stored = JSON.parse(localStorage.getItem('glow_orders') || '[]');
      const filtered = stored.filter((o: Order) => o.id !== order.id);
      filtered.unshift(dataToSave);
      localStorage.setItem('glow_orders', JSON.stringify(filtered));
    } catch (e) {}

    // Send to backend API as well to keep Express in-memory map updated
    try {
      await fetch('/api/admin/sync-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
    } catch (e) {}
  } catch (error) {
    console.error('Erro ao salvar pedido no Firestore:', error);
    // Fallback to local storage if network or firestore fails
    try {
      const stored = JSON.parse(localStorage.getItem('glow_orders') || '[]');
      const filtered = stored.filter((o: Order) => o.id !== order.id);
      filtered.unshift(dataToSave);
      localStorage.setItem('glow_orders', JSON.stringify(filtered));
    } catch (e) {}
    throw handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
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

  return onSnapshot(
    q,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        ordersList.push(docSnap.data() as Order);
      });
      onData(ordersList);
    },
    (error) => {
      console.warn('Erro ao escutar ordens no Firestore (usando fallback):', error);
      if (onError) onError(error);
      
      // Fallback: Read local storage orders
      try {
        const stored = localStorage.getItem('glow_orders');
        if (stored) {
          onData(JSON.parse(stored));
        }
      } catch (e) {}
    }
  );
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

  return onSnapshot(
    orderRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as Order);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.warn(`Erro no listener da ordem ${orderId}:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Approve payment status of an order in Firestore
 */
export async function approveOrderInFirestore(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const updateData = {
    paymentStatus: 'approved' as const,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(orderRef, updateData);

    // Sync to local storage
    try {
      const stored = JSON.parse(localStorage.getItem('glow_orders') || '[]');
      const updated = stored.map((o: Order) =>
        o.id === orderId ? { ...o, ...updateData } : o
      );
      localStorage.setItem('glow_orders', JSON.stringify(updated));
    } catch (e) {}

    // Call server API
    try {
      await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
      });
    } catch (e) {}
  } catch (error) {
    console.error('Erro ao aprovar pedido no Firestore:', error);
    // If updateDoc fails (e.g. doc created client-side only), try setDoc merge
    try {
      await setDoc(orderRef, { id: orderId, ...updateData }, { merge: true });
    } catch (e) {}
    throw handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
}

/**
 * Delete an order from Firestore
 */
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  try {
    await deleteDoc(orderRef);

    // Update local storage
    try {
      const stored = JSON.parse(localStorage.getItem('glow_orders') || '[]');
      const filtered = stored.filter((o: Order) => o.id !== orderId);
      localStorage.setItem('glow_orders', JSON.stringify(filtered));
    } catch (e) {}

    // Call server API
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });
    } catch (e) {}
  } catch (error) {
    console.error('Erro ao excluir pedido do Firestore:', error);
    throw handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
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
    return result;
  } catch (error) {
    console.warn('Fallback ao buscar ordens:', error);
    try {
      const stored = localStorage.getItem('glow_orders');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }
}
