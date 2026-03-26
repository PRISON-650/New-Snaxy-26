import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, Image as ImageIcon, Check, X, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        image: newCategoryImage,
        order: categories.length + 1
      });
      toast.success('Category added');
      setNewCategoryName('');
      setNewCategoryImage('');
      fetchData();
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will not delete items in it, but they will be uncategorized.')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    isAvailable: true,
    isFeatured: false,
    calories: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const catsSnap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
    const cats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    setCategories(cats);

    const itemsSnap = await getDocs(collection(db, 'menuItems'));
    setItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    setLoading(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      image: item.image,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      calories: item.calories?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'menuItems', id));
      toast.success('Item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price),
      calories: parseInt(formData.calories) || 0,
      isAvailable: Boolean(formData.isAvailable),
      isFeatured: Boolean(formData.isFeatured)
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), data);
        toast.success('Item updated');
      } else {
        await addDoc(collection(db, 'menuItems'), data);
        toast.success('Item added');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', categoryId: '', image: '', isAvailable: true, isFeatured: false, calories: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save item');
    }
  };

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(i => i.categoryId === activeCategory);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">MENU MANAGEMENT</h1>
          <p className="text-neutral-500">Add, edit, or remove items from your menu.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-white text-neutral-900 border border-neutral-100 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-neutral-50 transition-all"
          >
            <Filter className="w-5 h-5" /> Categories
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', description: '', price: '', categoryId: '', image: '', isAvailable: true, isFeatured: false, calories: '' });
              setIsModalOpen(true);
            }}
            className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
          >
            <Plus className="w-5 h-5" /> Add New Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold whitespace-nowrap transition-all",
            activeCategory === 'all' ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-100"
          )}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-6 py-2 rounded-xl font-bold whitespace-nowrap transition-all",
              activeCategory === cat.id ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-100"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-neutral-400">Item</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-neutral-400">Category</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-neutral-400">Price</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-neutral-400">Status</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-neutral-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-xs text-neutral-400 line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-medium text-neutral-600">
                    {categories.find(c => c.id === item.categoryId)?.name}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className="font-bold text-orange-600">{formatCurrency(item.price)}</span>
                </td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    item.isAvailable ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {item.isAvailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {item.isAvailable ? 'Available' : 'Out of Stock'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl p-12"
          >
            <h2 className="text-3xl font-black tracking-tighter mb-8">
              {editingItem ? 'EDIT ITEM' : 'ADD NEW ITEM'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Item Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Category</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 h-24 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Price (PKR)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Calories</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={e => setFormData({ ...formData, calories: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Image URL</label>
                  <input
                    required
                    type="url"
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                  />
                </div>
              </div>

              <div className="flex gap-8 py-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                    formData.isAvailable ? "bg-orange-600 border-orange-600" : "border-neutral-200 group-hover:border-orange-600"
                  )} onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}>
                    {formData.isAvailable && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-sm font-bold text-neutral-600">Available for Order</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                    formData.isFeatured ? "bg-orange-600 border-orange-600" : "border-neutral-200 group-hover:border-orange-600"
                  )} onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}>
                    {formData.isFeatured && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-sm font-bold text-neutral-600">Feature on Homepage</span>
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-200"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCategoryModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl p-12"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black tracking-tighter">MANAGE CATEGORIES</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4 mb-8">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Category Name</label>
                  <input
                    required
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="e.g. Burgers"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Icon URL (Optional)</label>
                  <input
                    type="url"
                    value={newCategoryImage}
                    onChange={e => setNewCategoryImage(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-200"
              >
                Add Category
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
              <label className="text-xs font-black uppercase tracking-widest text-neutral-400 block mb-4">Existing Categories</label>
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <img src={cat.image || 'https://picsum.photos/seed/food/200/200'} alt={cat.name} className="w-5 h-5 object-contain" />
                    </div>
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
