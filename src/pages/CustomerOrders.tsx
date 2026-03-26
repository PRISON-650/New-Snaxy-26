import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Order } from '../types';
import { motion } from 'motion/react';
import { Package, Clock, CheckCircle2, Truck, XCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' },
  preparing: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Preparing' },
  ready: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Ready for Pickup' },
  delivered: { icon: Truck, color: 'text-neutral-500', bg: 'bg-neutral-50', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
};

export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">My Orders</h1>
        <p className="text-neutral-500">Track and manage your recent orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-200">
          <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-neutral-300" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">No orders yet</h2>
          <p className="text-neutral-500 mb-6 text-sm">Looks like you haven't placed any orders yet.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-full font-bold hover:bg-orange-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <Link to={`/order/${order.id}`} className="block p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${status.bg} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${status.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-neutral-900">Order #{order.id?.slice(-6).toUpperCase()}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {format(new Date(order.createdAt), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-8">
                      <div className="text-right">
                        <p className="text-xs text-neutral-400 mb-1">Total Amount</p>
                        <p className="font-bold text-neutral-900">Rs. {order.total.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-400 mb-1">Items</p>
                        <p className="font-bold text-neutral-900">{order.items.length}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
