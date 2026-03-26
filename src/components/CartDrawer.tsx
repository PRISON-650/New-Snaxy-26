import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { formatCurrency } from '../lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, total, itemCount } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold">Your Cart ({itemCount})</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-neutral-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Your cart is empty</h3>
                    <p className="text-neutral-500">Looks like you haven't added anything yet.</p>
                  </div>
                  <Link
                    to="/menu"
                    onClick={onClose}
                    className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-700 transition-colors"
                  >
                    Browse Menu
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.itemId} className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover border border-neutral-100"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <h4 className="font-bold">{item.name}</h4>
                        <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-neutral-50 rounded-full px-3 py-1">
                          <button
                            onClick={() => updateQuantity(item.itemId, -1)}
                            className="p-1 hover:text-orange-600 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.itemId, 1)}
                            className="p-1 hover:text-orange-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.itemId)}
                          className="text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="block w-full bg-orange-600 text-white text-center py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                >
                  Checkout Now
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
