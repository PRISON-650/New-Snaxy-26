export type UserRole = 'customer' | 'admin' | 'cashier';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image: string;
  isAvailable: boolean;
  isFeatured: boolean;
  calories?: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'completed';
export type OrderType = 'online' | 'walk-in';

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  discount: number;
  status: OrderStatus;
  type: OrderType;
  createdAt: any; // Firestore Timestamp
  deliveryAddress?: string;
  paymentMethod: 'cash' | 'online';
  cashReceived?: number;
  changeAmount?: number;
  notes?: string;
}

export interface CashRegisterSession {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: any;
  endTime?: any;
  openingBalance: number;
  closingBalance?: number;
  cashSales: number;
  onlineSales: number;
  expenses: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: 'open' | 'closed';
}

export interface Expense {
  id: string;
  cashierId: string;
  type: string;
  amount: number;
  note: string;
  timestamp: any;
  sessionId: string;
}

export interface DailyReport {
  id: string;
  date: string;
  totalOrders: number;
  walkinSales: number;
  onlineSales: number;
  totalExpenses: number;
  cashExpected: number;
  cashCounted: number;
  difference: number;
  generatedAt: any;
}

export interface StoreSettings {
  isOpen: boolean;
  deliveryFee: number;
  minOrder: number;
}
