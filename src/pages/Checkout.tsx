import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';
import { ShoppingBag, Truck, MapPin, User, ChevronRight, CheckCircle2, Navigation, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Checkout() {
  const { user, login } = useAuth();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [locating, setLocating] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: 'Rawalpindi',
    zip: '',
    phone: '',
    paymentMethod: 'cash',
    location: null as { lat: number; lng: number } | null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
        
        try {
          // Attempt reverse geocoding using a free service or just set coordinates
          // For now, we'll just store the coordinates and tell the user
          toast.success('Location detected! Please refine your address below.');
        } catch (error) {
          console.error('Error in reverse geocoding:', error);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not detect location. Please enter manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to place an order');
      login();
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!formData.phone || !formData.address) {
      toast.error('Please provide your phone number and delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customerId: user.uid,
        customerName: user.displayName || 'Guest',
        customerEmail: user.email,
        items: items,
        total: total,
        status: 'pending',
        createdAt: serverTimestamp(),
        deliveryAddress: `${formData.address}${formData.city ? `, ${formData.city}` : ''}`,
        phone: formData.phone,
        paymentMethod: 'cash', // Force COD
        coordinates: formData.location
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Update Daily Report Real-time
      const today = new Date().toISOString().split('T')[0];
      const reportRef = doc(db, 'dailyReports', today);
      await setDoc(reportRef, {
        date: today,
        onlineSales: increment(total),
        totalOrders: increment(1),
        generatedAt: serverTimestamp()
      }, { merge: true });

      clearCart();
      
      // Major confetti celebration
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      toast.success('Order placed successfully! We will call you soon.');
      navigate(`/order/${docRef.id}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-neutral-300" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-4 uppercase">YOUR CART IS EMPTY</h1>
        <p className="text-neutral-500 mb-8 max-w-md">Add some delicious items to your cart before checking out.</p>
        <Link to="/menu" className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-200">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-4 mb-12">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-lg", step >= 1 ? "bg-orange-600 text-white shadow-orange-200" : "bg-neutral-100 text-neutral-400")}>1</div>
            <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-orange-600" : "bg-neutral-100")} />
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-lg", step >= 2 ? "bg-orange-600 text-white shadow-orange-200" : "bg-neutral-100 text-neutral-400")}>2</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white p-8 md:p-12 rounded-[3rem] border border-neutral-100 shadow-xl space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-orange-600" />
                      </div>
                      <h2 className="text-3xl font-black tracking-tighter uppercase">Delivery Details</h2>
                    </div>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={locating}
                      className="flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 transition-colors uppercase tracking-widest"
                    >
                      <Navigation className={cn("w-4 h-4", locating && "animate-spin")} />
                      {locating ? 'Locating...' : 'Auto Detect'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">Full Delivery Address</label>
                      <div className="relative">
                        <textarea
                          required
                          name="address"
                          rows={3}
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="House #, Street Name, Area, Landmark..."
                          className="w-full px-6 py-5 bg-neutral-50 border-2 border-neutral-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-all text-lg font-medium resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">City</label>
                        <input
                          required
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Rawalpindi / Islamabad"
                          className="w-full px-6 py-5 bg-neutral-50 border-2 border-neutral-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-all text-lg font-medium"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">Phone Number</label>
                        <input
                          required
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="03XX-XXXXXXX"
                          className="w-full px-6 py-5 bg-neutral-50 border-2 border-neutral-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-all text-lg font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-3xl flex gap-4 border border-blue-100">
                    <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-blue-800 font-medium leading-relaxed">
                      <span className="font-black block mb-1 uppercase tracking-widest text-xs">Pro Tip:</span>
                      Adding a nearby landmark (like a famous shop or mosque) helps our riders find you faster!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.address || !formData.phone) {
                        toast.error('Please fill in all details');
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full bg-neutral-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-neutral-200 group"
                  >
                    Review Order 
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-8 md:p-12 rounded-[3rem] border border-neutral-100 shadow-xl space-y-10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">Final Review</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 space-y-6">
                      <div className="flex items-start gap-4">
                        <MapPin className="w-6 h-6 text-orange-600 mt-1" />
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Delivery To</h4>
                          <p className="text-xl font-bold text-neutral-900">{formData.address}</p>
                          <p className="text-neutral-500">{formData.city}</p>
                          <p className="text-orange-600 font-black mt-2">{formData.phone}</p>
                        </div>
                      </div>

                      <div className="h-px bg-neutral-200" />

                      <div className="flex items-start gap-4">
                        <Truck className="w-6 h-6 text-orange-600 mt-1" />
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Payment Mode</h4>
                          <p className="text-xl font-bold text-neutral-900 uppercase">Cash on Delivery</p>
                          <p className="text-neutral-500">Pay when your food is delivered to your doorstep.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-neutral-100 text-neutral-600 py-6 rounded-3xl font-black text-xl hover:bg-neutral-200 transition-all"
                    >
                      Edit Details
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-orange-600 text-white py-6 rounded-3xl font-black text-2xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-orange-200 disabled:opacity-50 active:scale-95"
                    >
                      {loading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          Placing...
                        </div>
                      ) : (
                        <>Confirm Order • {formatCurrency(total)}</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-xl sticky top-24 space-y-8">
            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
              Summary
            </h2>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {items.map(item => (
                <div key={item.itemId} className="flex justify-between items-center gap-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-50 overflow-hidden flex-shrink-0 border border-neutral-100 group-hover:scale-105 transition-transform">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 line-clamp-1">{item.name}</h4>
                      <span className="text-sm font-black text-orange-600">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-bold text-neutral-900">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t-2 border-dashed border-neutral-100 space-y-4">
              <div className="flex justify-between text-neutral-500 font-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 font-bold">
                <span>Delivery</span>
                <span className="text-green-600 uppercase tracking-widest text-xs font-black">Free</span>
              </div>
              <div className="flex justify-between text-3xl font-black pt-4 border-t border-neutral-50">
                <span className="tracking-tighter uppercase">Total</span>
                <span className="text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {!user && (
              <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100 space-y-4">
                <p className="text-sm text-orange-800 font-bold leading-relaxed">Login to track your order and get exclusive Pakistani deals!</p>
                <button
                  onClick={login}
                  className="w-full bg-white text-orange-600 py-3 rounded-2xl font-black text-sm border-2 border-orange-200 hover:bg-orange-100 transition-all shadow-sm"
                >
                  Sign In with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
