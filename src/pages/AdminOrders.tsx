import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Clock, CheckCircle2, Package, Truck, XCircle, ChevronRight, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'New Order', color: 'bg-orange-100 text-orange-600', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-600', icon: Package },
  ready: { label: 'Ready', color: 'bg-purple-100 text-purple-600', icon: CheckCircle2 },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-600', icon: Truck },
  completed: { label: 'Completed', color: 'bg-neutral-100 text-neutral-900', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: XCircle }
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">ORDER QUEUE</h1>
          <p className="text-neutral-500">Manage real-time orders and update their status.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-neutral-100">
          {['all', 'pending', 'preparing', 'ready', 'delivered', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-900"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col lg:flex-row">
            {/* Status Sidebar */}
            <div className={cn(
              "w-full lg:w-48 p-8 flex lg:flex-col items-center justify-center gap-4 text-center",
              STATUS_CONFIG[order.status].color
            )}>
              {React.createElement(STATUS_CONFIG[order.status].icon, { className: "w-10 h-10" })}
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                <span className="text-lg font-bold uppercase">{STATUS_CONFIG[order.status].label}</span>
              </div>
            </div>

            {/* Order Content */}
            <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black tracking-tight">#{order.id.slice(-6).toUpperCase()}</h3>
                  <span className="text-xs text-neutral-400 font-bold">{order.createdAt?.toDate().toLocaleTimeString()}</span>
                </div>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-neutral-600"><span className="font-bold">{item.quantity}x</span> {item.name}</span>
                      <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-neutral-100 flex justify-between items-center font-black text-lg">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(order.total)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Customer Info</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-neutral-400" />
                    </div>
                    <span className="text-sm font-bold">{order.customerName}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-neutral-400" />
                    </div>
                    <span className="text-sm text-neutral-500 leading-tight">{order.deliveryAddress}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Update Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="col-span-2 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      Start Preparing <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="col-span-2 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                    >
                      Mark as Ready <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="col-span-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      Mark as Delivered <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="col-span-2 border border-red-100 text-red-500 py-3 rounded-xl font-bold text-sm hover:bg-red-50 transition-all"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
