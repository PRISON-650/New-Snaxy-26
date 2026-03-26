import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  getDocs,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { 
  MenuItem, 
  Category, 
  Order, 
  OrderItem, 
  OrderStatus, 
  CashRegisterSession, 
  Expense,
  DailyReport
} from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  ShoppingBag, 
  CreditCard, 
  Wallet, 
  X, 
  Check, 
  ChevronRight, 
  Printer, 
  History, 
  LogOut, 
  ArrowRight,
  PlusCircle,
  FileText,
  AlertCircle,
  Banknote,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function Cashier() {
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('');
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const activeTab = (searchParams.get('tab') as 'pos' | 'queue' | 'expenses' | 'report') || 'pos';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ type: '', amount: '', note: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [isClosingSession, setIsClosingSession] = useState(false);

  // Fetch Session
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setSessionLoading(false);
      return;
    }
    
    console.log('Fetching session for user:', user.uid, 'isAdmin:', isAdmin, 'email:', user.email);
    setSessionLoading(true);
    setError(null);
    
    const q = query(
      collection(db, 'cashRegisterSessions'),
      where('status', '==', 'open')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const openSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashRegisterSession));
      console.log('Open sessions found:', openSessions.length);
      
      const mySession = openSessions.find(s => s.cashierId === user.uid);
      
      if (mySession) {
        console.log('Found my session:', mySession.id);
        setSession(mySession);
      } else if (isAdmin || isSuperAdmin || user.email === 'mdanyalkayani77@gmail.com') {
        console.log('Admin bypass: checking for any open session');
        // Admins see the latest open session or a mock one if none exists
        if (openSessions.length > 0) {
          setSession(openSessions[0]);
        } else {
          setSession({
            id: 'admin-bypass',
            cashierId: user.uid,
            cashierName: user.displayName || 'Admin',
            startTime: Timestamp.now(),
            openingBalance: 0,
            cashSales: 0,
            onlineSales: 0,
            expenses: 0,
            expectedCash: 0,
            status: 'open'
          } as CashRegisterSession);
        }
      } else {
        console.log('No session found for cashier');
        setSession(null);
      }
      setSessionLoading(false);
    }, (err) => {
      console.error('Session fetch error:', err);
      setError(`Session fetch error: ${err.message}`);
      setSessionLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid, isAdmin, isSuperAdmin, authLoading]);

  // Fetch Menu
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    }, (err) => {
      console.error('Menu items fetch error:', err);
      setError(`Menu items fetch error: ${err.message}`);
    });
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)).sort((a, b) => a.order - b.order));
    }, (err) => {
      console.error('Categories fetch error:', err);
      setError(`Categories fetch error: ${err.message}`);
    });
    return () => { unsubItems(); unsubCats(); };
  }, []);

  // Fetch Orders
  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Sort in memory to avoid index requirement
      setOrders(fetchedOrders.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          const d = new Date(val);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      }));
    }, (err) => {
      console.error('Orders fetch error:', err);
      setError(`Orders fetch error: ${err.message}`);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Expenses
  useEffect(() => {
    if (!session) return;
    const q = query(collection(db, 'expenses'), where('sessionId', '==', session.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      // Sort in memory to avoid index requirement
      setExpenses(fetchedExpenses.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          const d = new Date(val);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return getTime(b.timestamp) - getTime(a.timestamp);
      }));
    }, (err) => {
      console.error('Expenses fetch error:', err);
      setError(`Expenses fetch error: ${err.message}`);
    });
    return () => unsubscribe();
  }, [session]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  const total = Math.max(0, subtotal - discount);
  const change = parseFloat(cashReceived) ? parseFloat(cashReceived) - total : 0;

  const handleOpenSession = async () => {
    if (!user) {
      console.error('No user found in handleOpenSession');
      return;
    }
    
    if (!isAdmin && !openingBalance) {
      toast.error('Please enter an opening balance');
      return;
    }
    
    console.log('Opening session for user:', user.uid, 'balance:', openingBalance);
    setIsOpeningSession(true);
    try {
      const balance = parseFloat(openingBalance) || 0;
      const newSession: any = {
        cashierId: user.uid,
        cashierName: user.displayName || user.email,
        startTime: serverTimestamp(),
        openingBalance: balance,
        cashSales: 0,
        onlineSales: 0,
        expenses: 0,
        expectedCash: balance,
        status: 'open'
      };
      
      const docRef = await addDoc(collection(db, 'cashRegisterSessions'), newSession);
      console.log('Session created with ID:', docRef.id);
      toast.success('Session opened successfully');
    } catch (error) {
      console.error('Open session error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'cashRegisterSessions');
    } finally {
      setIsOpeningSession(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1, image: item.image }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.itemId !== itemId));
  };

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const handleConfirmPayment = async () => {
    if (!session || cart.length === 0 || !cashReceived || parseFloat(cashReceived) < total) {
      toast.error('Invalid payment details');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderData: any = {
        customerName: 'Walk-in Customer',
        items: cart,
        subtotal,
        discount,
        total,
        status: 'pending',
        type: 'walk-in',
        createdAt: serverTimestamp(),
        paymentMethod: 'cash',
        cashReceived: parseFloat(cashReceived),
        changeAmount: change,
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      const finalOrder = { id: orderRef.id, ...orderData, createdAt: new Date() };
      setLastOrder(finalOrder);
      
      // Update Session Stats
      if (session.id !== 'admin-bypass') {
        const sessionRef = doc(db, 'cashRegisterSessions', session.id);
        await updateDoc(sessionRef, {
          cashSales: session.cashSales + total,
          expectedCash: session.expectedCash + total
        });
      }

      toast.success(`Order #${orderRef.id.slice(-6)} sent to kitchen`);
      setCart([]);
      setDiscount(0);
      setCashReceived('');
      setIsReceiptModalOpen(true);
      
      // Auto-trigger print for thermal printer
      setTimeout(() => {
        if (document.getElementById('receipt-print')) {
          window.print();
        }
      }, 500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const handleAddExpense = async () => {
    if (!session || !newExpense.type || !newExpense.amount) return;
    setIsAddingExpense(true);
    try {
      const expenseData: Partial<Expense> = {
        cashierId: user?.uid,
        type: newExpense.type,
        amount: parseFloat(newExpense.amount),
        note: newExpense.note,
        timestamp: serverTimestamp(),
        sessionId: session.id
      };
      await addDoc(collection(db, 'expenses'), expenseData);
      
      // Update session
      if (session.id !== 'admin-bypass') {
        const sessionRef = doc(db, 'cashRegisterSessions', session.id);
        await updateDoc(sessionRef, {
          expenses: session.expenses + parseFloat(newExpense.amount),
          expectedCash: session.expectedCash - parseFloat(newExpense.amount)
        });
      }

      setNewExpense({ type: '', amount: '', note: '' });
      toast.success('Expense recorded');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'expenses');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleCloseSession = async (actualCash: number) => {
    if (!session) return;
    
    if (session.id === 'admin-bypass') {
      setSession(null);
      setIsClosingModalOpen(false);
      navigate('/admin');
      return;
    }

    setIsClosingSession(true);
    try {
      const difference = actualCash - session.expectedCash;
      const sessionRef = doc(db, 'cashRegisterSessions', session.id);
      await updateDoc(sessionRef, {
        actualCash,
        difference,
        endTime: serverTimestamp(),
        status: 'closed'
      });

      // Generate Daily Report
      const today = new Date().toISOString().split('T')[0];
      const reportRef = doc(db, 'dailyReports', today);
      
      await setDoc(reportRef, {
        date: today,
        totalOrders: orders.filter(o => o.type === 'walk-in').length,
        walkinSales: session.cashSales,
        onlineSales: session.onlineSales,
        totalExpenses: session.expenses,
        cashExpected: session.expectedCash,
        cashCounted: actualCash,
        difference: difference,
        generatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Session closed and report generated');
      setIsClosingModalOpen(false);
      setSession(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cashRegisterSessions');
    } finally {
      setIsClosingSession(false);
    }
  };

  console.log('Cashier Render:', {
    userId: user?.uid,
    userEmail: user?.email,
    isAdmin,
    isSuperAdmin,
    sessionStatus: session ? 'active' : 'none',
    sessionId: session?.id,
    sessionLoading
  });

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Something went wrong</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 font-bold">{authLoading ? 'Loading user profile...' : 'Checking register status...'}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-neutral-100 max-w-md w-full space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-black text-orange-600">PKR</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">OPEN REGISTER</h1>
            <p className="text-neutral-500">Enter the opening balance to start your shift.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Opening Cash Balance</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">PKR</div>
                <input 
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-14 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg"
                />
              </div>
            </div>

            <button 
              onClick={handleOpenSession}
              disabled={isOpeningSession || (!isAdmin && !isSuperAdmin && !openingBalance)}
              className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isOpeningSession ? 'Opening...' : 'Start Shift'}
              <ArrowRight className="w-5 h-5" />
            </button>

            {(isAdmin || isSuperAdmin) && (
              <button 
                onClick={() => setSession({
                  id: 'admin-bypass',
                  cashierId: user?.uid || 'admin',
                  cashierName: user?.displayName || 'Admin',
                  startTime: Timestamp.now(),
                  openingBalance: 0,
                  cashSales: 0,
                  onlineSales: 0,
                  expenses: 0,
                  expectedCash: 0,
                  status: 'open'
                } as CashRegisterSession)}
                className="w-full py-3 text-neutral-500 font-bold hover:text-orange-600 transition-colors text-sm"
              >
                Bypass & View POS
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-black tracking-tighter text-orange-600">SNAXY POS</h1>
          <nav className="flex gap-1">
            {[
              { id: 'pos', label: 'New Order', icon: PlusCircle },
              { id: 'queue', label: 'Order Queue', icon: Clock },
              { id: 'expenses', label: 'Expenses', icon: Banknote },
              { id: 'report', label: 'EOD Report', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
                  activeTab === tab.id ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "text-neutral-500 hover:bg-neutral-100"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {(isAdmin || isSuperAdmin) && (
            <button 
              onClick={() => navigate('/admin')}
              className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Exit to Admin
            </button>
          )}
          <div className="text-right">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Cashier</p>
            <p className="font-bold">{session.cashierName}</p>
          </div>
          <button 
            onClick={() => {
              if (isAdmin || isSuperAdmin) {
                navigate('/admin');
              } else {
                setIsClosingModalOpen(true);
              }
            }}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'pos' && (
          <>
            {/* Left Panel - Menu */}
            <div className="flex-1 flex flex-col border-r border-neutral-200 overflow-hidden bg-white">
              <div className="p-4 border-b border-neutral-100 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input 
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                      !selectedCategory ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    )}
                  >
                    All Items
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                        selectedCategory === cat.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="group bg-white border border-neutral-100 rounded-3xl p-3 text-left hover:border-orange-500 hover:shadow-xl hover:shadow-orange-50 transition-all space-y-3"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-100">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                      <p className="text-orange-600 font-black">{formatCurrency(item.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Panel - Cart & Payment */}
            <div className="w-[400px] flex flex-col bg-white overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-orange-600" />
                  CURRENT ORDER
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
                    <ShoppingBag className="w-16 h-16 opacity-20" />
                    <p className="font-bold">Cart is empty</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.itemId} className="flex gap-4 group">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                        <p className="text-neutral-500 font-bold text-xs">{formatCurrency(item.price)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => handleUpdateQuantity(item.itemId, -1)} className="p-1 hover:bg-neutral-100 rounded-lg"><Minus className="w-3 h-3" /></button>
                          <span className="font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.itemId, 1)} className="p-1 hover:bg-neutral-100 rounded-lg"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm">{formatCurrency(item.price * item.quantity)}</p>
                        <button onClick={() => handleRemoveFromCart(item.itemId)} className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-neutral-50 border-t border-neutral-200 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-neutral-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-neutral-500">
                    <span>Discount</span>
                    <input 
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right bg-transparent border-b border-neutral-300 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-xl font-black pt-2 border-t border-neutral-200">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cash Received</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-400">PKR</div>
                      <input 
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-14 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg"
                      />
                    </div>
                  </div>

                  {parseFloat(cashReceived) >= total && (
                    <div className="bg-green-50 p-4 rounded-2xl flex justify-between items-center">
                      <span className="text-green-600 font-bold text-sm">Change Due</span>
                      <span className="text-green-700 font-black text-xl">{formatCurrency(change)}</span>
                    </div>
                  )}

                  <button 
                    onClick={handleConfirmPayment}
                    disabled={isProcessingPayment || cart.length === 0 || !cashReceived || parseFloat(cashReceived) < total}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? 'Processing...' : 'Confirm Payment & Print'}
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto p-8 bg-neutral-50">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tight">ORDER QUEUE</h2>
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-white rounded-xl border border-neutral-200 text-sm font-bold flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live Updates
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(order => (
                  <motion.div 
                    layout
                    key={order.id}
                    className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-6 border-b border-neutral-100 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg">#{order.id.slice(-6).toUpperCase()}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                            order.type === 'walk-in' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                          )}>
                            {order.type}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-bold">{new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest",
                        order.status === 'pending' ? "bg-orange-100 text-orange-600" :
                        order.status === 'preparing' ? "bg-blue-100 text-blue-600" :
                        order.status === 'ready' ? "bg-green-100 text-green-600" : "bg-neutral-100 text-neutral-600"
                      )}>
                        {order.status}
                      </div>
                    </div>

                    <div className="p-6 flex-1 space-y-4">
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="font-bold text-neutral-600">{item.quantity}x {item.name}</span>
                            <span className="text-neutral-400">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <div className="p-3 bg-orange-50 rounded-xl text-xs text-orange-700 font-bold flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {order.notes}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-neutral-50 border-t border-neutral-100 grid grid-cols-2 gap-2">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          className="col-span-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'ready')}
                          className="col-span-2 py-3 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-colors"
                        >
                          Mark as Ready
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          className="col-span-2 py-3 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-colors"
                        >
                          Complete Order
                        </button>
                      )}
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                          className="col-span-2 py-2 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex-1 overflow-y-auto p-8 bg-neutral-50">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tight">EXPENSES</h2>
                <button 
                  onClick={() => setIsAddingExpense(true)}
                  className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Record Expense
                </button>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Type</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Note</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Amount</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {expenses.map(expense => (
                      <tr key={expense.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 uppercase tracking-wider">
                            {expense.type}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm text-neutral-500 font-medium">{expense.note}</td>
                        <td className="px-8 py-6 font-black text-red-600">{formatCurrency(expense.amount)}</td>
                        <td className="px-8 py-6 text-xs text-neutral-400 font-bold">
                          {new Date(expense.timestamp?.toDate?.() || expense.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-neutral-400 font-bold">No expenses recorded today</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Expense Modal */}
            <AnimatePresence>
              {isAddingExpense && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-neutral-100 max-w-md w-full space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-black tracking-tight">NEW EXPENSE</h3>
                      <button onClick={() => setIsAddingExpense(false)} className="p-2 hover:bg-neutral-100 rounded-xl"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Expense Type</label>
                        <select 
                          value={newExpense.type}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        >
                          <option value="">Select Type</option>
                          <option value="ingredients">Ingredients</option>
                          <option value="packaging">Packaging</option>
                          <option value="utilities">Utilities</option>
                          <option value="marketing">Marketing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Amount</label>
                        <input 
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Note</label>
                        <textarea 
                          value={newExpense.note}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, note: e.target.value }))}
                          placeholder="What was this for?"
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold h-24 resize-none"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleAddExpense}
                      className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all"
                    >
                      Record Expense
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-8 bg-neutral-50">
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-3xl font-black tracking-tight">END OF DAY REPORT</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Sales Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-bold">Walk-in Sales (Cash)</span>
                      <span className="font-black text-lg">{formatCurrency(session.cashSales)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-bold">Online Sales (Prepaid)</span>
                      <span className="font-black text-lg">{formatCurrency(session.onlineSales)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                      <span className="text-neutral-900 font-black">Total Sales</span>
                      <span className="font-black text-2xl text-orange-600">{formatCurrency(session.cashSales + session.onlineSales)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Cash Reconciliation</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-bold">Opening Balance</span>
                      <span className="font-black text-lg">{formatCurrency(session.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-bold">Cash Sales (+)</span>
                      <span className="font-black text-lg text-green-600">+{formatCurrency(session.cashSales)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-bold">Expenses (-)</span>
                      <span className="font-black text-lg text-red-600">-{formatCurrency(session.expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                      <span className="text-neutral-900 font-black">Expected Cash</span>
                      <span className="font-black text-2xl text-neutral-900">{formatCurrency(session.expectedCash)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-600 p-8 rounded-[3rem] text-white space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest opacity-80">Ready to close?</h3>
                    <p className="text-2xl font-bold">Complete your shift and generate report.</p>
                  </div>
                  <button 
                    onClick={() => setIsClosingModalOpen(true)}
                    className="px-8 py-4 bg-white text-orange-600 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-100 transition-all"
                  >
                    Close Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Receipt Modal */}
      <AnimatePresence>
        {isReceiptModalOpen && lastOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-neutral-100 max-w-sm w-full space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">PAYMENT SUCCESS</h3>
                <p className="text-neutral-500 font-bold">Order #{lastOrder.id.slice(-6).toUpperCase()}</p>
              </div>

              <div className="border-y border-dashed border-neutral-200 py-6 space-y-3 text-left">
                {lastOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="font-bold text-neutral-600">{item.quantity}x {item.name}</span>
                    <span className="font-black">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-dashed border-neutral-200 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-neutral-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(lastOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-neutral-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(lastOrder.discount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-orange-600 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(lastOrder.total)}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-dashed border-neutral-200 space-y-1 text-xs font-bold text-neutral-400">
                  <div className="flex justify-between">
                    <span>Cash Received</span>
                    <span>{formatCurrency(lastOrder.cashReceived || 0)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Change</span>
                    <span>{formatCurrency(lastOrder.changeAmount || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setActiveTab('queue');
                  }}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Print
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Thermal Receipt for Printing */}
      {lastOrder && (
        <div id="receipt-print" className="hidden">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>SNAXY 26</h2>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Red Town, Dhoke Ratta, Rawalpindi</p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>+92 332 6750700</p>
          </div>
          
          <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '5px 0', margin: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>Order: #{lastOrder.id.slice(-6).toUpperCase()}</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div style={{ fontSize: '10px' }}>
              <span>Cashier: {session.cashierName}</span>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            {lastOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ flex: 1 }}>{item.quantity}x {item.name}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed black', paddingTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(lastOrder.subtotal)}</span>
            </div>
            {lastOrder.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>-{formatCurrency(lastOrder.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(lastOrder.total)}</span>
            </div>
          </div>

          <div style={{ marginTop: '10px', fontSize: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cash Received:</span>
              <span>{formatCurrency(lastOrder.cashReceived || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Change:</span>
              <span>{formatCurrency(lastOrder.changeAmount || 0)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px' }}>
            <p>Thank you for choosing Snaxy 26!</p>
            <p>Enjoy your meal!</p>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      <AnimatePresence>
        {isClosingModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-neutral-100 max-w-md w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight">CLOSE REGISTER</h3>
                <button onClick={() => setIsClosingModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Expected Cash:</span>
                    <span className="font-bold">{formatCurrency(session.expectedCash)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Actual Cash in Drawer</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">PKR</div>
                    <input 
                      type="number"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-14 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsClosingModalOpen(false)}
                    className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleCloseSession(parseFloat(closingCash) || 0)}
                    disabled={isClosingSession || !closingCash}
                    className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isClosingSession ? 'Closing...' : 'Close & Logout'}
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
                
                {(isAdmin || isSuperAdmin) && (
                  <div className="pt-4 border-t border-neutral-100">
                    <button 
                      onClick={() => navigate('/admin')}
                      className="w-full py-3 text-neutral-400 font-bold hover:text-neutral-600 transition-colors text-xs uppercase tracking-widest"
                    >
                      Admin: Exit without closing session
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
