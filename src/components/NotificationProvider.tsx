import React, { createContext, useContext, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { Bell, ShoppingBag, Package, CheckCircle2, Truck, XCircle, Info, ArrowRight } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const STATUS_ICONS: Record<OrderStatus, any> = {
  pending: ShoppingBag,
  preparing: Package,
  ready: CheckCircle2,
  delivered: Truck,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-orange-500',
  preparing: 'bg-blue-500',
  ready: 'bg-purple-500',
  delivered: 'bg-green-500',
  completed: 'bg-neutral-900',
  cancelled: 'bg-red-500',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'New Order Received',
  preparing: 'Order is being Prepared',
  ready: 'Order is Ready for Pickup',
  delivered: 'Order has been Delivered',
  completed: 'Order has been Completed',
  cancelled: 'Order has been Cancelled',
};

const AdminNotification = ({ order, t, onClick }: { order: Order; t: any; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2 }}
    className="bg-neutral-900 text-white p-1 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-w-md w-full"
  >
    <div className="bg-orange-600 p-8 rounded-[2.2rem] flex items-center gap-6 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      
      <div className="w-20 h-20 bg-white text-orange-600 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-orange-900/20">
        <Bell className="w-10 h-10 animate-bounce" />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">Priority</span>
          <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">NEW ORDER</h3>
        </div>
        <p className="text-orange-100 font-bold text-lg">#{order.id.slice(-6).toUpperCase()}</p>
        <div className="flex items-center gap-3 pt-2">
          <span className="text-white font-black text-xl">{formatCurrency(order.total)}</span>
          <div className="h-4 w-px bg-white/30" />
          <span className="text-orange-100 text-sm font-bold uppercase tracking-tight">{order.customerName}</span>
        </div>
      </div>

      <button 
        onClick={() => toast.dismiss(t)}
        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <XCircle className="w-6 h-6 text-white/60" />
      </button>
    </div>
    
    <div className="px-8 py-4 flex items-center justify-between text-neutral-400">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest">Live Update</span>
      </div>
      <button 
        onClick={onClick}
        className="text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
      >
        View Queue <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  </motion.div>
);

const CustomerNotification = ({ order, t }: { order: Order; t: any }) => {
  const Icon = STATUS_ICONS[order.status as OrderStatus] || Info;
  const color = STATUS_COLORS[order.status as OrderStatus] || 'bg-neutral-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white p-2 rounded-[2.5rem] shadow-2xl border border-neutral-100 flex items-center gap-5 max-w-sm w-full group"
    >
      <div className={cn("w-16 h-16 rounded-[1.8rem] flex items-center justify-center flex-shrink-0 text-white shadow-lg transition-transform group-hover:scale-105", color)}>
        <Icon className="w-8 h-8" />
      </div>
      
      <div className="flex-1 pr-4">
        <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">Order Update</h4>
        <p className="text-lg font-black tracking-tight text-neutral-900 leading-tight">
          {STATUS_LABELS[order.status as OrderStatus]}
        </p>
        <p className="text-xs font-bold text-neutral-500 mt-1">
          Order #{order.id.slice(-6).toUpperCase()}
        </p>
      </div>

      <button 
        onClick={() => toast.dismiss(t)}
        className="p-2 hover:bg-neutral-50 rounded-full transition-colors mr-2"
      >
        <XCircle className="w-5 h-5 text-neutral-300" />
      </button>
    </motion.div>
  );
};

interface NotificationContextType {}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isCashier } = useAuth();
  const navigate = useNavigate();
  const adminInitialLoad = useRef(true);
  const customerInitialLoad = useRef(true);

  useEffect(() => {
    if (!user) return;

    let unsubscribeAdmin: (() => void) | undefined;
    if (isAdmin || isCashier) {
      const adminQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      unsubscribeAdmin = onSnapshot(adminQuery, (snapshot) => {
        if (adminInitialLoad.current) {
          adminInitialLoad.current = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const order = { id: change.doc.id, ...change.doc.data() } as Order;
            
            toast.custom((t) => (
              <AdminNotification 
                order={order} 
                t={t} 
                onClick={() => {
                  if (isCashier) {
                    navigate('/cashier?tab=queue');
                  } else {
                    navigate('/admin/orders');
                  }
                  toast.dismiss(t);
                }} 
              />
            ), {
              duration: 15000,
              position: 'top-right',
            });

            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(() => console.log('Audio blocked'));
          }
        });
      });
    }

    const customerQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid)
    );

    const unsubscribeCustomer = onSnapshot(customerQuery, (snapshot) => {
      if (customerInitialLoad.current) {
        customerInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const order = { id: change.doc.id, ...change.doc.data() } as Order;
          
          toast.custom((t) => <CustomerNotification order={order} t={t} />, {
            duration: 8000,
            position: 'bottom-right',
          });
        }
      });
    });

    return () => {
      unsubscribeAdmin?.();
      unsubscribeCustomer();
    };
  }, [user, isAdmin, isCashier]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
