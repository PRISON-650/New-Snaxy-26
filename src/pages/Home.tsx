import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, ShoppingBag, Zap, ShieldCheck, Heart } from 'lucide-react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Category } from '../types';
import { formatCurrency } from '../lib/utils';
import { useCart } from '../CartContext';
import MenuItemCard from '../components/MenuItemCard';
import MenuItemModal from '../components/MenuItemModal';

export default function Home() {
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      const itemsQuery = query(collection(db, 'menuItems'), where('isFeatured', '==', true), limit(4));
      const itemsSnap = await getDocs(itemsQuery);
      setFeaturedItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));

      const catsSnap = await getDocs(collection(db, 'categories'));
      setCategories(catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden bg-neutral-900">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2070"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl space-y-8"
          >
            <div className="inline-flex items-center gap-2 bg-orange-600/20 border border-orange-600/30 text-orange-500 px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase">
              <Zap className="w-4 h-4" />
              Fastest Delivery in Town
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter">
              CRAVE IT.<br />
              <span className="text-orange-600">ORDER IT.</span><br />
              EAT IT.
            </h1>
            
            <p className="text-xl text-neutral-300 max-w-lg leading-relaxed">
              Snaxy 26 delivers your favorite fast food in under 30 minutes. Fresh, hot, and straight to your door.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/menu"
                className="bg-orange-600 text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-700 transition-all hover:scale-105 shadow-xl shadow-orange-600/20"
              >
                Order Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/menu"
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-10 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
              >
                View Menu
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">30k+</span>
                <span className="text-sm text-neutral-400">Happy Customers</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">4.9/5</span>
                <span className="text-sm text-neutral-400">Average Rating</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">20min</span>
                <span className="text-sm text-neutral-400">Avg. Delivery</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tighter mb-2">POPULAR CATEGORIES</h2>
            <p className="text-neutral-500">Explore our wide range of delicious options</p>
          </div>
          <Link to="/menu" className="text-orange-600 font-bold flex items-center gap-1 hover:underline">
            See All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <Link
                to={`/menu?category=${cat.id}`}
                className="group block bg-white border border-neutral-100 p-6 rounded-3xl text-center hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-orange-50 rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                  <img src={cat.image || 'https://picsum.photos/seed/food/200/200'} alt={cat.name} className="w-12 h-12 object-contain group-hover:invert transition-all" />
                </div>
                <span className="font-bold text-neutral-800">{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Items */}
      <section className="bg-neutral-100 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-black tracking-tighter mb-2">WEEKLY SPECIALS</h2>
              <p className="text-neutral-500">Hand-picked favorites just for you</p>
            </div>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-8">
            {featuredItems.map((item, idx) => (
              <MenuItemCard 
                key={item.id} 
                item={item} 
                index={idx}
                onSelect={setSelectedItem}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Item Detail Modal */}
      <MenuItemModal 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
      />

      {/* Why Us */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 text-center p-8 rounded-[3rem] bg-orange-50">
            <div className="w-16 h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Fast Delivery</h3>
            <p className="text-neutral-500">Your food arrives hot and fresh in under 30 minutes, guaranteed.</p>
          </div>
          <div className="space-y-4 text-center p-8 rounded-[3rem] bg-neutral-100">
            <div className="w-16 h-16 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 -rotate-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Quality Food</h3>
            <p className="text-neutral-500">We use only the freshest ingredients from local suppliers.</p>
          </div>
          <div className="space-y-4 text-center p-8 rounded-[3rem] bg-orange-50">
            <div className="w-16 h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Best Service</h3>
            <p className="text-neutral-500">Our customer support is available 24/7 to help you with your order.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
