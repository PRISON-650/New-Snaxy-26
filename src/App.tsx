/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider } from './CartContext';
import { NotificationProvider } from './components/NotificationProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import CustomerOrders from './pages/CustomerOrders';
import Dashboard from './pages/Dashboard';
import AdminMenu from './pages/AdminMenu';
import AdminOrders from './pages/AdminOrders';
import AdminUsers from './pages/AdminUsers';
import AdminReports from './pages/AdminReports';
import Cashier from './pages/Cashier';

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false, staffOnly = false }: { children: React.ReactNode, adminOnly?: boolean, superAdminOnly?: boolean, staffOnly?: boolean }) {
  const { user, loading, isAdmin, isSuperAdmin, isStaff, isCashier } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute Check:', {
    path: location.pathname,
    loading,
    user: user?.email,
    isAdmin,
    isSuperAdmin,
    isStaff,
    isCashier,
    adminOnly,
    superAdminOnly,
    staffOnly
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to /');
    return <Navigate to="/" />;
  }
  
  // Cashiers should only see the cashier page
  if (isCashier && location.pathname !== '/cashier') {
    console.log('ProtectedRoute: Cashier on wrong path, redirecting to /cashier');
    return <Navigate to="/cashier" replace />;
  }

  if (adminOnly && !isAdmin) {
    console.log('ProtectedRoute: Admin only, but user is not admin, redirecting to /');
    return <Navigate to="/" />;
  }
  if (superAdminOnly && !isSuperAdmin) {
    console.log('ProtectedRoute: SuperAdmin only, but user is not superadmin, redirecting to /');
    return <Navigate to="/" />;
  }
  if (staffOnly && !isStaff) {
    console.log('ProtectedRoute: Staff only, but user is not staff, redirecting to /');
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
            <Router>
              <NotificationProvider>
                <Routes>
                  <Route path="/" element={<Layout><Home /></Layout>} />
                  <Route path="/menu" element={<Layout><Menu /></Layout>} />
                  <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
                  <Route path="/orders" element={<ProtectedRoute><Layout><CustomerOrders /></Layout></ProtectedRoute>} />
                  <Route path="/order/:id" element={<Layout><OrderTracking /></Layout>} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute adminOnly>
                      <Layout admin><Dashboard /></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/menu" element={
                    <ProtectedRoute adminOnly>
                      <Layout admin><AdminMenu /></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/orders" element={
                    <ProtectedRoute adminOnly>
                      <Layout admin><AdminOrders /></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute superAdminOnly>
                      <Layout admin><AdminUsers /></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/reports" element={
                    <ProtectedRoute adminOnly>
                      <Layout admin><AdminReports /></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/cashier" element={
                    <ProtectedRoute staffOnly>
                      <Cashier />
                    </ProtectedRoute>
                  } />
                </Routes>
                <Toaster 
                  position="top-right" 
                  toastOptions={{
                    duration: 3000,
                    style: { marginTop: '80px' }
                  }}
                />
              </NotificationProvider>
            </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

