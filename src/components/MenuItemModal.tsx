import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ShoppingBag } from 'lucide-react';
import { MenuItem } from '../types';
import { formatCurrency } from '../lib/utils';
import { useCart } from '../CartContext';
import confetti from 'canvas-confetti';

interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export default function MenuItemModal({ item, onClose }: MenuItemModalProps) {
  const { addItem } = useCart();

  if (!item) return null;

  const handleAddToCart = (e: React.MouseEvent) => {
    addItem(item);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 40,
      spread: 70,
      origin: { x, y },
      colors: ['#ea580c', '#f97316', '#fb923c', '#ffffff'],
      ticks: 100
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full md:w-1/2 h-80 md:h-auto">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="w-full md:w-1/2 p-12 flex flex-col justify-center space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-sm uppercase tracking-widest">
                  <Star className="w-4 h-4 fill-orange-600" /> Best Seller
                </div>
                <h2 className="text-4xl font-black tracking-tighter">{item.name}</h2>
                <p className="text-3xl font-black text-orange-600">{formatCurrency(item.price)}</p>
              </div>

              <p className="text-neutral-500 text-lg leading-relaxed">
                {item.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-2xl">
                  <span className="block text-xs text-neutral-400 uppercase font-bold mb-1">Calories</span>
                  <span className="text-xl font-bold">{item.calories || '450'} kcal</span>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl">
                  <span className="block text-xs text-neutral-400 uppercase font-bold mb-1">Prep Time</span>
                  <span className="text-xl font-bold">10-15 min</span>
                </div>
              </div>

              <div className="space-y-6">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-200 active:scale-95"
                >
                  <ShoppingBag className="w-6 h-6" /> Add to Cart
                </button>
                <p className="text-center text-xs font-black text-orange-600 uppercase tracking-widest animate-pulse">
                  ✨ Tip: Check your cart to complete order!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
