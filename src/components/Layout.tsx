import React, { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { ShoppingCart, User as UserIcon, Menu as MenuIcon, X, LogOut, LayoutDashboard, Utensils, ClipboardList, ChevronDown, ShoppingBag } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { cn } from '../lib/utils';
import CartDrawer from './CartDrawer';
import LoginModal from './LoginModal';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  admin?: boolean;
}

export default function Layout({ children, admin = false }: LayoutProps) {
  const { user, logout, isAdmin, isSuperAdmin, isCashier, isStaff } = useAuth();
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();

  const navItems = admin ? [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Menu Items', path: '/admin/menu', icon: Utensils },
    { name: 'Orders', path: '/admin/orders', icon: ClipboardList },
    { name: 'POS (Cashier)', path: '/cashier', icon: ShoppingBag },
    ...(isSuperAdmin ? [{ name: 'Users', path: '/admin/users', icon: UserIcon }] : []),
  ] : [
    { name: 'Home', path: '/' },
    { name: 'Menu', path: '/menu' },
  ];

  // If cashier, they should only see the POS
  if (isCashier && location.pathname !== '/cashier') {
    return <Navigate to="/cashier" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-orange-600 tracking-tighter">
              SNAXY 26
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    location.pathname === item.path ? "text-orange-600" : "text-neutral-600 hover:text-orange-600"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!admin && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-neutral-600 hover:text-orange-600 transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`} alt={user.displayName} className="w-8 h-8 rounded-full border border-neutral-200" />
                  <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", isUserDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsUserDropdownOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 z-20 overflow-hidden"
                      >
                        <div className="p-4 border-b border-neutral-100">
                          <p className="text-sm font-bold text-neutral-900 truncate">{user.displayName || 'User'}</p>
                          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                        </div>
                        
                        <div className="p-2">
                          {isStaff && (
                            <Link 
                              to="/cashier" 
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-orange-600 rounded-lg transition-colors"
                            >
                              <ShoppingBag className="w-4 h-4" />
                              POS (Cashier)
                            </Link>
                          )}
                          {isAdmin && (
                            <Link 
                              to="/admin" 
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-orange-600 rounded-lg transition-colors"
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              Admin Dashboard
                            </Link>
                          )}
                          <Link 
                            to="/orders" 
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-orange-600 rounded-lg transition-colors"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            My Orders
                          </Link>
                        </div>

                        <div className="p-2 border-t border-neutral-100">
                          <button
                            onClick={() => {
                              logout();
                              setIsUserDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="text-sm font-medium bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700 transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-4 h-16 flex items-center justify-between border-b border-neutral-100">
                <span className="font-bold text-orange-600">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium transition-colors",
                      location.pathname === item.path ? "bg-orange-50 text-orange-600" : "text-neutral-600 hover:bg-neutral-50"
                    )}
                  >
                    {item.icon && <item.icon className="w-5 h-5" />}
                    {item.name}
                  </Link>
                ))}
                
                {user && (
                  <>
                    <div className="h-px bg-neutral-100 my-2" />
                    <Link
                      to="/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium text-neutral-600 hover:bg-neutral-50"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      My Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium text-neutral-600 hover:bg-neutral-50"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Admin Dashboard
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 border-t border-neutral-100">
                {user ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-2">
                      <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-neutral-200" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-900 truncate">{user.displayName}</p>
                        <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsLoginModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-orange-600 mb-4">SNAXY 26</h3>
            <p className="text-neutral-500 max-w-sm">
              Lightning-fast online ordering for your favorite fast food. Fresh ingredients, bold flavors, delivered in minutes.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-neutral-500">
              <li><Link to="/menu">Menu</Link></li>
              <li><Link to="/checkout">Cart</Link></li>
              <li><Link to="/">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-neutral-500">
              <li>support@snaxy26.com</li>
              <li>+92 332 6750700-SNAXY-26</li>
              <li>Snaxy 26, Red Town , Dhoke Ratta, Rawalpindi</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-neutral-100 text-center text-neutral-400 text-sm">
          © 2026 Snaxy 26. All rights reserved.
        </div>
      </footer>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
