import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Package, Truck, MapPin, ChevronRight, ShoppingBag, Phone } from 'lucide-react';
import { db } from '../firebase';
import { Order, OrderStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';

const STATUS_STEPS: { status: OrderStatus; label: string; icon: any; description: string }[] = [
  { status: 'pending', label: 'Order Placed', icon: ClipboardList, description: 'We have received your order' },
  { status: 'preparing', label: 'Preparing', icon: Utensils, description: 'Chef is cooking your meal' },
  { status: 'ready', label: 'Ready for Pickup', icon: Package, description: 'Your food is packed and ready' },
  { status: 'delivered', label: 'Delivered', icon: Truck, description: 'Enjoy your delicious meal!' }
];

import { ClipboardList, Utensils } from 'lucide-react';

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', id), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading order...</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center">Order not found</div>;

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">ORDER #{order.id.slice(-6).toUpperCase()}</h1>
        <p className="text-neutral-500">Estimated delivery: <span className="text-neutral-900 font-bold">25-30 mins</span></p>
      </div>

      {/* Status Timeline */}
      <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-neutral-100 shadow-sm">
        <div className="relative flex flex-col md:flex-row justify-between gap-8">
          {/* Progress Line */}
          <div className="absolute left-6 md:left-0 md:top-6 md:right-0 h-full md:h-1 w-1 md:w-full bg-neutral-100 z-0">
            <motion.div
              initial={{ width: 0, height: 0 }}
              animate={{ 
                width: window.innerWidth >= 768 ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` : '4px',
                height: window.innerWidth < 768 ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` : '4px'
              }}
              className="bg-orange-600 h-full md:h-full w-full md:w-full"
            />
          </div>

          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isActive = idx === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.status} className="relative z-10 flex md:flex-col items-center gap-6 md:gap-4 md:text-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "bg-white text-neutral-300 border-4 border-neutral-100"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 md:flex-none">
                  <h3 className={cn("font-bold text-lg", isCompleted ? "text-neutral-900" : "text-neutral-400")}>{step.label}</h3>
                  <p className="text-sm text-neutral-400 hidden md:block max-w-[120px] mx-auto">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Details */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            Order Details
          </h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.itemId} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-neutral-100 rounded-md flex items-center justify-center text-xs font-bold">{item.quantity}x</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="pt-4 border-t border-neutral-100 flex justify-between items-center text-xl font-black">
              <span>Total</span>
              <span className="text-orange-600">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            Delivery Information
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-400 uppercase tracking-wider">Address</h4>
                <p className="font-medium">{order.deliveryAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-400 uppercase tracking-wider">Contact</h4>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-neutral-500">Payment: {order.paymentMethod.toUpperCase()}</p>
              </div>
            </div>
          </div>
          <button className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors">
            Contact Support
          </button>
        </div>
      </div>

      <div className="text-center">
        <Link to="/menu" className="inline-flex items-center gap-2 text-neutral-500 font-bold hover:text-orange-600 transition-colors">
          Order something else <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
