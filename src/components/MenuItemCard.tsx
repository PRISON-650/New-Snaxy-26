import React from 'react';
import { motion } from 'motion/react';
import { Plus, Info, ShoppingBag, Star } from 'lucide-react';
import { MenuItem, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useCart } from '../CartContext';
import confetti from 'canvas-confetti';

interface MenuItemCardProps {
  item: MenuItem;
  categoryName?: string;
  onSelect: (item: MenuItem) => void;
  index?: number;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, categoryName, onSelect, index = 0 }) => {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      viewport={{ once: true }}
      onClick={() => onSelect(item)}
      className="bg-white rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all group border border-neutral-100 cursor-pointer h-full flex flex-col"
    >
      <div className="relative h-24 sm:h-56 overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        {categoryName && (
          <div className="absolute top-1 left-1 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-md px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[7px] sm:text-[10px] font-black tracking-widest uppercase">
            {categoryName}
          </div>
        )}
        <div className="absolute top-1 right-1 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-md px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1">
          <Star className="w-2 h-2 sm:w-3 sm:h-3 text-yellow-500 fill-yellow-500" /> 4.8
        </div>
        <div className="absolute bottom-1 right-1 sm:bottom-4 sm:right-4 bg-orange-600 text-white p-1 sm:p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="w-3 h-3 sm:w-5 sm:h-5" />
        </div>
      </div>
      
      <div className="p-2 sm:p-6 space-y-1 sm:space-y-4 flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5 sm:gap-1">
          <h3 className="text-[10px] sm:text-lg font-bold leading-tight line-clamp-1">{item.name}</h3>
          <span className="text-orange-600 font-black text-[10px] sm:text-base whitespace-nowrap">{formatCurrency(item.price)}</span>
        </div>
        <p className="text-neutral-500 text-[8px] sm:text-sm line-clamp-1 sm:line-clamp-2 flex-1">{item.description}</p>
        
        <div className="flex items-center gap-1 sm:gap-4 pt-1 sm:pt-2 relative group-item">
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-neutral-900 text-white py-1.5 sm:py-3 rounded-md sm:rounded-xl text-[9px] sm:text-base font-bold flex items-center justify-center gap-1 sm:gap-2 hover:bg-orange-600 transition-all active:scale-95 shadow-lg hover:shadow-orange-200"
          >
            <ShoppingBag className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button 
            className="p-1.5 sm:p-3 bg-neutral-100 text-neutral-600 rounded-md sm:rounded-xl hover:bg-neutral-200 transition-colors"
          >
            <Info className="w-2.5 h-2.5 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;
